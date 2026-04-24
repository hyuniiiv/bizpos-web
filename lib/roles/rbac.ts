import { createAdminClient } from '@/lib/supabase/admin'

export type Resource = 'merchants' | 'stores' | 'clients' | 'terminals' | 'users';
export type Action = 'create' | 'read' | 'update' | 'delete';

/**
 * DB 기반 권한 체크 유틸리티
 */
export async function checkPermission(
  role: string, 
  resource: Resource, 
  action: Action
): Promise<boolean> {
  const supabase = createAdminClient();
  const column = `can_${action}` as const;
  
  const { data } = await supabase
    .from('role_permissions')
    .select(column)
    .eq('role', role)
    .eq('resource', resource)
    .single();

  return !!(data as any)?.[column];
}
