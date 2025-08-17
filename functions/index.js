import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import sgMail from '@sendgrid/mail';

admin.initializeApp();

// Set SENDGRID_API_KEY env var or use: firebase functions:config:set sendgrid.key="SG.xxxxx"
const SENDGRID_KEY = process.env.SENDGRID_API_KEY || functions.config().sendgrid?.key;
if (SENDGRID_KEY) sgMail.setApiKey(SENDGRID_KEY);

export const onApplicationStatusChange = functions.firestore
  .document('applications/{appId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (!before || !after) return null;
    if (before.status === after.status) return null; // only on status change

    try {
      const promoterRef = admin.firestore().doc(`users/${after.promoterId}`);
      const promoterSnap = await promoterRef.get();
      const promoter = promoterSnap.data() || {};
      const to = promoter.email;
      if (!to || !SENDGRID_KEY) return null;

      const subject = `Your application is ${after.status.toUpperCase()}`;
      const text = `Hi ${promoter.name || ''},\n\nYour application status changed to: ${after.status}.\n\nThanks,\nFindMe! Team`;
      const html = `<p>Hi ${promoter.name || ''},</p><p>Your application status changed to: <b>${after.status.toUpperCase()}</b>.</p><p>Thanks,<br/>FindMe! Team</p>`;
      await sgMail.send({ to, from: 'no-reply@findme.app', subject, text, html });
      return null;
    } catch (e) {
      console.error('Email send failed', e);
      return null;
    }
  });
