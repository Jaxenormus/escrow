import { Guild } from 'discord.js';

export default async function assignMemberRole(
  id: string,
  role: string,
  guild: Guild
): Promise<void> {
  const member = await guild.members.fetch(id);
  const found = await guild.roles.fetch(role);
  if (found) member.roles.add(found);
}
