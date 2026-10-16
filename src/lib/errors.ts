// Turns database error codes (raised by the RPCs in the migration) into kind,
// human sentences. Unknown errors get a generic message; details are never
// leaked to the screen.

const MESSAGES: Record<string, string> = {
  not_authenticated: 'Please sign in again.',
  no_couple: 'You are not part of a shared path yet.',
  partner_not_joined: 'Your partner needs to join before you can start walking.',
  already_in_couple: 'You are already part of a shared path.',
  invalid_invite: 'That invite code is not valid, or it has already been used.',
  couple_full: 'This path already has two people.',
  date_too_old: 'That day is too far back to confirm now.',
  date_in_future: 'That day has not happened yet.',
  before_journey_start: 'That day is before your journey began.',
  no_open_journey: 'There is no open journey right now.',
  journey_not_started: 'Your new journey begins tomorrow, so there is nothing to reset yet.',
  confirmation_required: 'Please confirm before resetting.',
  invalid_reward: 'Reward ideas need to be between 1 and 200 characters.',
  not_found: 'We could not find that.',
};

export function friendlyError(message: string | undefined | null): string {
  if (!message) return 'Something went wrong. Please try again.';
  for (const [code, text] of Object.entries(MESSAGES)) {
    if (message.includes(code)) return text;
  }
  return 'Something went wrong. Please try again.';
}
