import { AppError } from "../../core/errors";
import { normalizeEmail, normalizeText } from "../../core/formatters";
import { createAccessToken, verifyPassword } from "../../core/security";
import { requireFields } from "../../core/validators";
import { UserService } from "../users/service";

export class AuthService {
  private userService = new UserService();

  async login(payload: Record<string, unknown>) {
    requireFields(payload, ["email", "password"]);
    const email = normalizeEmail(String(payload.email));
    const password = normalizeText(String(payload.password));

    let user;
    let authenticatedByLocalFallback = false;
    let deferredError: unknown = null;

    try {
      user = await this.userService.getByEmail(email);
    } catch (error) {
      if (!(error instanceof AppError) || error.statusCode !== 404) {
        deferredError = error;
      }
    }

    if (!user) {
      try {
        user = this.tryLocalMasterLogin(email, password);
        authenticatedByLocalFallback = true;
      } catch (fallbackError) {
        if (deferredError) {
          throw deferredError;
        }
        throw fallbackError;
      }
    }

    if (user.status !== "ACTIVE") {
      throw new AppError("Credenciais inválidas.", 401);
    }

    if (!authenticatedByLocalFallback && !verifyPassword(password, user.senha_hash)) {
      throw new AppError("Credenciais inválidas.", 401);
    }

    const token = createAccessToken(user);
    return { token, user: this.userService.serializeUser(user) };
  }

  private tryLocalMasterLogin(email: string, password: string) {
    const localMaster = this.userService.getLocalMasterUser();
    const localMasterPassword = normalizeText(this.userService.getLocalMasterPassword());

    if (
      localMaster
      && localMaster.email === email
      && password === localMasterPassword
    ) {
      return localMaster;
    }

    throw new AppError("Credenciais inválidas.", 401);
  }
}
