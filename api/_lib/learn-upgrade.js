// THE SWITCH of step 2 (10/11, Nico): "Everything we teach" for the difference, €53 (€59 minus the €5.99 already paid),
// offered to who has just bought one Full guide. While this is an empty string nothing is offered anywhere. Paste the
// Stripe Payment Link here to turn it on, and two things start together:
// - the card on /learn/thanks/full-* once Stripe has confirmed the payment (views/Thanks.astro, components/FunnelUpgrade.astro)
// - one line under the PDFs in the email the webhook sends after a Full guide (api/stripe-webhook.js)
// Both open /go/everything-upgrade, which carries the click to this link. It lives here, in plain JS, because the
// webhook cannot read the site's .ts files: src/lib/learn.ts takes it from this file, so there is one switch, not two.
// Stripe product name: "Everything we teach · upgrade" (api/_lib/learn-files.js delivers the whole pack), back to
// https://www.omnyalab.com/learn/thanks/everything?session_id={CHECKOUT_SESSION_ID}
export const everythingUpgrade = 'https://buy.stripe.com/bJedR8acRbIs3hAbmB8so0F';
