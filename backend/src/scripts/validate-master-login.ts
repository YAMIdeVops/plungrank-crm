import { getSettings } from "../config";
import { AuthService } from "../modules/auth/service";

async function main() {
  const settings = getSettings();
  const service = new AuthService();
  const response = await service.login({
    email: settings.masterAdminEmail,
    password: settings.masterAdminPassword,
  });
  const user = response.user;
  console.log(`Login validado para ${user.email} com perfil ${user.perfil}.`);
}

void main();
