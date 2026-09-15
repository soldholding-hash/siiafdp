import { supabase } from "./db";

export async function genererCertificatGage(gageId) {
  const { data, error } = await supabase.rpc("generer_certificat_gage", {
    p_gage_id: gageId,
  });
  if (error) throw error;
  return data;
}

export async function verifierCertificatPublic(code) {
  const { data, error } = await supabase.rpc("verifier_certificat_public", {
    p_code: code,
  });
  if (error) throw error;
  return data;
}
