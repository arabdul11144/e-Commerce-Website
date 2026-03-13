import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Shield,
  ShieldAlert,
  Ban,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useSellerAuth } from '../../contexts/SellerAuthContext';
import { getErrorMessage } from '../../lib/api';
import {
  fetchAdminUsers,
  type AdminUsersResponse,
  type AdminUserRow,
  updateAdminUser,
} from '../../lib/admin';

const EMPTY_USERS: AdminUsersResponse = {
  items: [],
  pagination: {
    page: 1,
    limit: 8,
    totalItems: 0,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
  },
};

function buildPageNumbers(currentPage: number, totalPages: number) {
  const maxButtons = Math.min(3, totalPages);
  const startPage = Math.max(1, Math.min(currentPage - 1, totalPages - maxButtons + 1));

  return Array.from({ length: maxButtons }, (_, index) => startPage + index);
}

export function AdminUsersPage() {
  const { token, seller } = useSellerAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [usersResponse, setUsersResponse] = useState<AdminUsersResponse>(EMPTY_USERS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, searchTerm]);

  useEffect(() => {
    if (!token || !seller) {
      setUsersResponse(EMPTY_USERS);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    fetchAdminUsers(token, {
      page,
      limit: 8,
      search: searchTerm,
      role: roleFilter,
    })
      .then((response) => {
        if (!isCancelled) {
          setUsersResponse(response);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error(getErrorMessage(error));
          setUsersResponse(EMPTY_USERS);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [page, roleFilter, searchTerm, seller, token]);

  const pageNumbers = useMemo(
    () => buildPageNumbers(usersResponse.pagination.page, usersResponse.pagination.totalPages),
    [usersResponse.pagination.page, usersResponse.pagination.totalPages]
  );

  const roleFilterLabel = useMemo(() => {
    switch (roleFilter) {
      case 'admin':
        return 'Role: Admin';
      case 'user':
        return 'Role: User';
      default:
        return 'Role: All';
    }
  }, [roleFilter]);

  const cycleRoleFilter = () => {
    setRoleFilter((currentRole) => {
      switch (currentRole) {
        case 'all':
          return 'admin';
        case 'admin':
          return 'user';
        default:
          return 'all';
      }
    });
  };

  const refreshUsers = async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetchAdminUsers(token, {
        page,
        limit: 8,
        search: searchTerm,
        role: roleFilter,
      });
      setUsersResponse(response);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusToggle = async (selectedUser: AdminUserRow) => {
    if (!token) {
      return;
    }

    try {
      await updateAdminUser(token, selectedUser.id, {
        status: selectedUser.status === 'active' ? 'blocked' : 'active',
      });

      toast.success(
        selectedUser.status === 'active'
          ? `${selectedUser.name} blocked`
          : `${selectedUser.name} unblocked`
      );

      await refreshUsers();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleRoleToggle = async (selectedUser: AdminUserRow) => {
    if (!token) {
      return;
    }

    const nextRole = selectedUser.role === 'admin' ? 'user' : 'admin';
    const confirmed = window.confirm(
      `Change ${selectedUser.name} to ${nextRole}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await updateAdminUser(token, selectedUser.id, { role: nextRole });
      toast.success(`${selectedUser.name} is now ${nextRole}`);
      await refreshUsers();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Users Management</h1>
          <p className="text-body text-sm mt-1">
            Manage customers and admin accounts.
          </p>
        </div>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="w-full sm:w-96 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full bg-background border border-subtle/50 rounded-lg py-2 pl-9 pr-4 text-sm text-primary focus:outline-none focus:border-accent-blue transition-colors"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            leftIcon={<Filter className="w-4 h-4" />}
            className="flex-1 sm:flex-none"
            onClick={cycleRoleFilter}
          >
            {roleFilterLabel}
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-elevated/50 text-muted text-xs uppercase tracking-wider border-b border-subtle/30">
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Orders</th>
                <th className="p-4 font-medium">Total Spent</th>
                <th className="p-4 font-medium">Joined</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/20">
              {!isLoading &&
                usersResponse.items.map((item) => (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={item.id}
                    className="hover:bg-elevated/30 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center font-bold flex-shrink-0">
                          {(item.name || 'U').charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted">{item.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {item.role === 'admin' ? (
                          <>
                            <ShieldAlert className="w-4 h-4 text-accent-gold" />
                            <span className="text-sm font-medium text-accent-gold">
                              Admin
                            </span>
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 text-muted" />
                            <span className="text-sm text-body">User</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-body">{item.orders}</td>
                    <td className="p-4 text-sm font-medium text-primary">
                      $
                      {item.spent.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-4 text-sm text-body">{item.joined}</td>
                    <td className="p-4">
                      <Badge variant={item.status === 'active' ? 'success' : 'error'}>
                        {item.status === 'active' ? 'Active' : 'Blocked'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.status === 'active' ? (
                          <button
                            onClick={() => handleStatusToggle(item)}
                            className="p-1.5 text-muted hover:text-status-error hover:bg-status-error/10 rounded transition-colors"
                            title="Block User"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusToggle(item)}
                            className="p-1.5 text-muted hover:text-status-success hover:bg-status-success/10 rounded transition-colors"
                            title="Unblock User"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRoleToggle(item)}
                          className="p-1.5 text-muted hover:text-primary hover:bg-elevated rounded transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>
        {!isLoading && usersResponse.items.length === 0 && (
          <div className="p-8 text-center text-muted">
            No users found matching your search.
          </div>
        )}
        {isLoading && (
          <div className="p-8 text-center text-muted">Loading users...</div>
        )}
        <div className="p-4 border-t border-subtle/30 flex items-center justify-between text-sm text-muted">
          <span>Showing {usersResponse.items.length} users</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={!usersResponse.pagination.hasPrevPage}
              className="px-3 py-1 rounded border border-subtle/30 hover:bg-elevated disabled:opacity-50"
            >
              Prev
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                className={`px-3 py-1 rounded ${
                  pageNumber === usersResponse.pagination.page
                    ? 'bg-accent-blue text-background font-medium'
                    : 'border border-subtle/30 hover:bg-elevated'
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={!usersResponse.pagination.hasNextPage}
              className="px-3 py-1 rounded border border-subtle/30 hover:bg-elevated disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
