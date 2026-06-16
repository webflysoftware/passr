import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { getDb } from "../db.js";
import { buildSubscribeWelcomeEmail, sendEmail } from "./email.js";

function serializeComment(comment, profileByUserId) {
  const userId = comment.userId ? String(comment.userId) : null;
  const authorProfile = userId ? profileByUserId.get(userId) : null;

  return {
    id: String(comment._id),
    _id: String(comment._id),
    articleSlug: comment.articleSlug,
    body: comment.body,
    parentId: comment.parentId ? String(comment.parentId) : null,
    userId,
    authorName: comment.authorName || authorProfile?.displayName || null,
    authorEmail: comment.authorEmail || null,
    authorProfile: authorProfile
      ? {
          userId,
          displayName: authorProfile.displayName,
          avatarUrl: authorProfile.avatarUrl,
        }
      : comment.authorName
        ? {
            userId: null,
            displayName: comment.authorName,
            avatarUrl: null,
          }
        : null,
    createdAt: comment.createdAt?.toISOString?.() || comment.createdAt,
    updatedAt: comment.updatedAt?.toISOString?.() || comment.updatedAt,
  };
}

async function loadProfilesForComments(comments) {
  const userIds = [...new Set(comments.map((c) => c.userId).filter(Boolean))];
  if (!userIds.length) return new Map();

  const db = getDb();
  const users = await db
    .collection("users")
    .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
    .project({ passrProfile: 1, name: 1 })
    .toArray();

  return new Map(
    users.map((user) => [
      String(user._id),
      {
        userId: String(user._id),
        displayName: user.passrProfile?.displayName || user.name,
        avatarUrl: user.passrProfile?.avatarUrl || null,
        bio: user.passrProfile?.bio || "",
        memberSince: user.createdAt?.toISOString?.() || user.createdAt,
      },
    ])
  );
}

export async function getComments(articleSlug) {
  const db = getDb();
  const comments = await db
    .collection("comments")
    .find({ articleSlug, approved: true })
    .sort({ createdAt: 1 })
    .toArray();

  const profiles = await loadProfilesForComments(comments);
  const serialized = comments.map((comment) => serializeComment(comment, profiles));

  return {
    comments: serialized,
    total: serialized.length,
  };
}

export async function postComment({ articleSlug, body, parentId, user }) {
  const db = getDb();

  if (parentId) {
    const parent = await db.collection("comments").findOne({
      _id: new ObjectId(parentId),
      articleSlug,
      approved: true,
    });
    if (!parent) {
      const error = new Error("Parent comment not found");
      error.status = 400;
      throw error;
    }
  }

  const now = new Date();
  const doc = {
    articleSlug,
    body: body.trim(),
    userId: new ObjectId(user.id),
    authorName: user.passrProfile?.displayName || user.name,
    authorEmail: user.email,
    parentId: parentId ? new ObjectId(parentId) : null,
    approved: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection("comments").insertOne(doc);
  const inserted = await db.collection("comments").findOne({ _id: result.insertedId });
  const profiles = await loadProfilesForComments([inserted]);
  return serializeComment(inserted, profiles);
}

async function collectDescendantIds(rootId) {
  const db = getDb();
  const ids = [rootId];
  let queue = [rootId];

  while (queue.length) {
    const current = queue.shift();
    const children = await db
      .collection("comments")
      .find({ parentId: new ObjectId(current) })
      .project({ _id: 1 })
      .toArray();
    for (const child of children) {
      const childId = String(child._id);
      ids.push(childId);
      queue.push(childId);
    }
  }

  return ids;
}

export async function updateCommentAdmin(commentId, payload, actor) {
  if (!actor.isPassrSuperAdmin) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }

  const db = getDb();
  const comment = await db.collection("comments").findOne({ _id: new ObjectId(commentId) });
  if (!comment) {
    const error = new Error("Comment not found");
    error.status = 404;
    throw error;
  }

  const update = {
    body: payload.body.trim(),
    updatedAt: new Date(),
  };

  if (payload.userId) {
    const user = await db.collection("users").findOne({ _id: new ObjectId(payload.userId) });
    if (!user) {
      const error = new Error("Assigned user not found");
      error.status = 404;
      throw error;
    }
    update.userId = user._id;
    update.authorName = user.passrProfile?.displayName || user.name;
    update.authorEmail = user.email;
  } else {
    update.userId = null;
    update.authorName = payload.authorName.trim();
    update.authorEmail = payload.authorEmail.trim().toLowerCase();
  }

  await db.collection("comments").updateOne({ _id: comment._id }, { $set: update });
  const updated = await db.collection("comments").findOne({ _id: comment._id });
  const profiles = await loadProfilesForComments([updated]);
  return serializeComment(updated, profiles);
}

export async function deleteCommentAdmin(commentId, actor) {
  if (!actor.isPassrSuperAdmin) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }

  const db = getDb();
  const comment = await db.collection("comments").findOne({ _id: new ObjectId(commentId) });
  if (!comment) {
    const error = new Error("Comment not found");
    error.status = 404;
    throw error;
  }

  const ids = await collectDescendantIds(commentId);
  await db.collection("comments").deleteMany({
    _id: { $in: ids.map((id) => new ObjectId(id)) },
  });

  return { deleted: ids.length };
}

export async function subscribeEmail(email) {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();

  let isNewSubscriber = false;

  try {
    await db.collection("subscribers").insertOne({
      email: normalizedEmail,
      createdAt: new Date(),
    });
    isNewSubscriber = true;
  } catch (err) {
    if (err.code === 11000) {
      console.info("[subscribe]", JSON.stringify({ event: "duplicate", email: normalizedEmail, emailSent: false }));
      return { message: "Subscribed successfully" };
    }
    throw err;
  }

  console.info("[subscribe]", JSON.stringify({ event: "new_subscriber", email: normalizedEmail, emailSent: true }));

  if (isNewSubscriber) {
    const { subject, text, html, tag } = buildSubscribeWelcomeEmail({ siteUrl: config.siteUrl });
    try {
      await sendEmail({ to: normalizedEmail, subject, text, html, tag });
    } catch (mailErr) {
      console.error("[subscribe]", JSON.stringify({ event: "welcome_email_failed", email: normalizedEmail, error: mailErr.message }));
    }
  }

  return { message: "Subscribed successfully" };
}

export async function saveContactMessage({ name, email, message }) {
  const db = getDb();
  await db.collection("contact_messages").insertOne({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    message: message.trim(),
    createdAt: new Date(),
  });

  return { message: "Message sent successfully" };
}
