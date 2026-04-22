export interface SerializedUser {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  status: string;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface UserRecord extends SerializedUser {
  senha_hash: string;
}
