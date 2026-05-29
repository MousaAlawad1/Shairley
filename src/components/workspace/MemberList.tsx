// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/workspace/MemberList.tsx
// PURPOSE: Member management component — Premium motion edition
// ═══════════════════════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { Search, Users, Trash2 } from 'lucide-react';
import { WorkspaceMember, Role, MemberRoleFilter } from '@/types';
import { staggerContainer, staggerItem, tapScale, spring } from '@/lib/motion';
import OwnerBadge from '@/components/common/OwnerBadge';
import ColoredAvatar from '@/components/common/ColoredAvatar';

interface MemberListProps {
  members: WorkspaceMember[];
  currentUserId?: string;
  currentUserRole: Role | null;
  onRoleChange: (member: WorkspaceMember, newRole: Role) => Promise<void>;
  onRemoveMember: (member: WorkspaceMember) => Promise<void>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  roleFilter: MemberRoleFilter;
  onRoleFilterChange: (filter: MemberRoleFilter) => void;
}

function roleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    owner: 'مالك',
    admin: 'مشرف',
    member: 'عضو',
    viewer: 'مشاهد',
    guest: 'ضيف',
  };
  return labels[role] || role;
}

function roleBadgeClass(role: Role): string {
  const classes: Record<Role, string> = {
    owner: 'bg-brand-accent/15 text-brand-accent',
    admin: 'bg-brand-accent/15 text-brand-accent',
    member: 'bg-sage/15 text-sage',
    viewer: 'bg-surface-3 text-fg-3',
    guest: 'bg-surface-3 text-fg-4',
  };
  return classes[role] || '';
}

export default function MemberList({
  members,
  currentUserId,
  currentUserRole,
  onRoleChange,
  onRemoveMember,
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
}: MemberListProps) {
  
  const canManageMember = (member: WorkspaceMember): boolean => {
    if (!currentUserId || !currentUserRole) return false;
    if (member.role === 'owner') return false;
    if (member.user_id === currentUserId) return false;
    if (currentUserRole === 'owner') return true;
    if (currentUserRole === 'admin') {
      return member.role !== 'admin';
    }
    return false;
  };

  const getAvailableRoles = (member: WorkspaceMember): Role[] => {
    if (!canManageMember(member)) return [];
    if (currentUserRole === 'owner') return ['admin', 'member', 'viewer', 'guest'];
    if (currentUserRole === 'admin') return ['member', 'viewer', 'guest'];
    return [];
  };

  const filteredMembers = members.filter((member) => {
    const matchesRole = roleFilter === 'all' ? true : member.role === roleFilter;
    const searchTarget = `${member.display_name || ''} ${member.email || ''} ${member.role}`.toLowerCase();
    const matchesSearch = searchTarget.includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-3">
      {/* Filters Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.smooth}
        className="rounded-2xl border border-line/70 bg-surface-2/60 p-4 flex flex-wrap gap-3 items-center justify-between backdrop-blur"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="بحث عن عضو..."
              className="field !w-64 !pr-10"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value as MemberRoleFilter)}
            className="rounded-xl border border-line-strong bg-surface-1/80 px-3 py-2 text-sm text-fg-1 focus:outline-none focus:border-brand-accent/70"
          >
            <option value="all">كل الأدوار</option>
            <option value="owner">مالك</option>
            <option value="admin">مشرف</option>
            <option value="member">عضو</option>
            <option value="viewer">مشاهد</option>
            <option value="guest">ضيف</option>
          </select>
        </div>

        <p className="text-xs text-fg-3">
          عرض {filteredMembers.length} من أصل {members.length} عضو
        </p>
      </motion.div>

      {/* Members List */}
      {members.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-fg-4"
        >
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>لا يوجد أعضاء بعد</p>
        </motion.div>
      ) : filteredMembers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-fg-4"
        >
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>لا توجد نتائج مطابقة للفلترة الحالية</p>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {filteredMembers.map((member) => {
            const availableRoles = getAvailableRoles(member);
            const manageable = canManageMember(member);

            return (
              <motion.div
                key={member.id}
                variants={staggerItem}
                whileHover={{ x: -2 }}
                transition={spring.snappy}
                className="bg-surface-2/80 border border-line/70 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap hover:border-brand-accent/20 transition-colors"
              >
                {/* Member Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <motion.div whileHover={{ scale: 1.1 }} transition={spring.snappy}>
                    <ColoredAvatar
                      name={member.display_name}
                      email={member.email}
                      size="md"
                    />
                  </motion.div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-2 flex-wrap"><p className="font-medium text-sm text-fg-1 truncate">
                        {member.display_name || member.user_id?.slice(0, 8) || 'عضو'}
                      </p><OwnerBadge email={member.email} size="sm" /></span>
                      {member.is_current_user && (
                        <span className="rounded-full bg-brand-accent/10 border border-brand-accent/20 px-2 py-0.5 text-[10px] text-brand-accent">أنت</span>
                      )}
                    </div>
                    <p className="text-xs text-fg-4 truncate">
                      {member.email || new Date(member.joined_at).toLocaleDateString('ar')}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleBadgeClass(member.role)}`}>
                    {roleLabel(member.role)}
                  </span>

                  {manageable && availableRoles.length > 0 && (
                    <select
                      value={member.role}
                      onChange={(e) => onRoleChange(member, e.target.value as Role)}
                      className="rounded-xl border border-line-strong bg-surface-1 px-3 py-2 text-xs text-fg-1 focus:outline-none focus:border-brand-accent/70"
                    >
                      {availableRoles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  )}

                  {manageable && (
                    <motion.button
                      {...tapScale}
                      onClick={() => onRemoveMember(member)}
                      className="inline-flex items-center gap-2 rounded-xl border border-brick/40 bg-brick/10 px-3 py-2 text-xs text-brick-soft hover:bg-brick/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      إزالة
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}