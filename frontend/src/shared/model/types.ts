export type UserProfile = "ADMIN" | "PADRAO";
export type UserStatus = "ACTIVE" | "INACTIVE";

export type AuthUser = {
  id: string;
  nome: string;
  email: string;
  perfil: UserProfile;
  status: UserStatus;
};

export type Lead = {
  id_lead: number;
  nome_contato: string;
  nome_empresa: string;
  telefone: string;
  instagram: string;
  nicho: string;
  fonte_lead: string;
  situacao: string;
  estado: string;
  tem_site: string;
  data_cadastro: string;
};

export type Attempt = {
  id_tentativa: number;
  id_lead: number;
  data_tentativa: string;
  modalidade: string;
  canal: string;
  status: string;
  notification?: string;
};

export type Meeting = {
  id_reuniao: number;
  id_lead: number;
  data_reuniao: string;
  status_reuniao: string;
  notification?: string;
};

export type ServiceItem = {
  id_servico: number;
  nome_servico: string;
  valor: number;
};

export type Sale = {
  id_venda: number;
  id_lead: number;
  id_servico: number;
  id_reuniao?: number | null;
  origem_fechamento: string;
  valor_venda: number;
  data_venda: string;
};
