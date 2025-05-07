// storage.ts
export const userData = new Map<string, { puuid: string, randomIconId: number }>(); // Mapa para almacenar el puuid y el randomIconId por usuario

// Almacenar el puuid y el randomIconId
export function storeUserData(userId: string, puuid: string, randomIconId: number) {
  userData.set(userId, { puuid, randomIconId });
}

// Recuperar el puuid
export function getPuuid(userId: string): string | undefined {
  return userData.get(userId)?.puuid;
}

// Recuperar el randomIconId
export function getRandomIconId(userId: string): number | undefined {
  return userData.get(userId)?.randomIconId;
}
