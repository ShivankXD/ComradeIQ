import * as Ably from "ably";

export function missionChannelName(missionId: string) {
  return `mission:${missionId}`;
}

function getAblyRest() {
  const key = process.env.ABLY_API_KEY;
  if (!key) throw new Error("ABLY_API_KEY is not configured.");
  return new Ably.Rest({ key });
}

export async function publishMissionEvent(channelName: string, eventName: string, data: unknown) {
  await getAblyRest().channels.get(channelName).publish(eventName, data);
}

export async function createMissionSubscriptionToken(missionId: string) {
  const capability = JSON.stringify({ [missionChannelName(missionId)]: ["subscribe"] });
  return getAblyRest().auth.createTokenRequest({ capability });
}
