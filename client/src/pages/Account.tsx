import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, LogOut, Package, Pencil, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest, getErrorMessage, resolveApiUrl } from '../lib/api';
import { formatCurrency } from '../utils/product';

interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

interface UpdatedProfileResponse {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  avatar?: string;
}

interface AccountOrderProduct {
  id?: string;
  _id?: string;
  slug?: string;
  name?: string;
  brand?: string;
  images?: string[];
}

interface AccountOrderItem {
  quantity?: number;
  price?: number;
  product?: AccountOrderProduct | null;
}

interface AccountOrder {
  _id: string;
  total: number;
  status: 'pending' | 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
  items: AccountOrderItem[];
  shippingAddress?: {
    fullName?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    phone?: string;
  };
}

interface AccountAddress {
  id: string;
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string;
  isDefault: boolean;
}

type AccountTab =
  | 'account-details'
  | 'my-orders'
  | 'order-history'
  | 'addresses'
  | 'card-details';

interface AccountLocationState {
  activeTab?: 'profile' | 'orders' | 'addresses' | AccountTab;
}

const AUTH_STORAGE_KEY = 'techvault.auth';
const CANCELLABLE_ORDER_STATUSES = new Set<AccountOrder['status']>([
  'pending',
  'processing',
  'confirmed',
]);

function formatOrderDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getOrderStatusVariant(status: AccountOrder['status']) {
  if (status === 'delivered') {
    return 'success' as const;
  }

  if (status === 'cancelled') {
    return 'error' as const;
  }

  return 'warning' as const;
}

function getOrderItemCount(items: AccountOrder['items']) {
  return items.reduce((total, item) => total + Math.max(1, Number(item.quantity) || 1), 0);
}

function isOrderCancellable(status: AccountOrder['status']) {
  return CANCELLABLE_ORDER_STATUSES.has(status);
}

function getOrderItemImage(item: AccountOrderItem) {
  return item.product?.images?.[0] ? resolveApiUrl(item.product.images[0]) : '';
}

function getOrderItemLineTotal(item: AccountOrderItem) {
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const price = Number(item.price) || 0;
  return quantity * price;
}

function mapLocationStateToTab(value?: AccountLocationState['activeTab']): AccountTab {
  switch (value) {
    case 'profile':
    case 'account-details':
    case 'addresses':
      return 'account-details';
    case 'order-history':
      return 'order-history';
    case 'card-details':
      return 'card-details';
    case 'orders':
    case 'my-orders':
    default:
      return 'my-orders';
  }
}

export function Account() {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const authUser = user as (typeof user & { avatar?: string }) | null;
  const locationState = location.state as AccountLocationState | null;

  const [activeTab, setActiveTab] = useState<AccountTab>(() =>
    mapLocationStateToTab(locationState?.activeTab)
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileImage, setProfileImage] = useState<string>('');
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<AccountAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [removingAddressId, setRemovingAddressId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const photoMenuRef = useRef<HTMLDivElement | null>(null);

  const tabs = [
    { id: 'account-details' as const, label: 'Account details', icon: User },
    { id: 'my-orders' as const, label: 'My orders', icon: Package },
    { id: 'order-history' as const, label: 'Order history', icon: Package },
    { id: 'sign-out' as const, label: 'Sign out', icon: LogOut },
    { id: 'card-details' as const, label: 'Card details', icon: CreditCard },
  ];

  const profileData = useMemo(
    () => ({
      fullName: user?.name ?? '',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      avatar: authUser?.avatar ?? '',
    }),
    [user, authUser]
  );

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    if (locationState?.activeTab) {
      setActiveTab(mapLocationStateToTab(locationState.activeTab));
    }
  }, [locationState?.activeTab]);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    setProfileForm({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone,
      password: '',
    });
  }, [profileData]);

  useEffect(() => {
    setProfileImage(profileData.avatar || '');
  }, [profileData.avatar]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(event.target as Node)) {
        setIsPhotoMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const shouldLoadOrders = activeTab === 'my-orders' || activeTab === 'order-history';

    if (!shouldLoadOrders) {
      return;
    }

    if (!token) {
      setOrders([]);
      setIsLoadingOrders(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingOrders(true);

    apiRequest<AccountOrder[]>('/api/orders/myorders', { token })
      .then((response) => {
        if (!isCancelled) {
          setOrders(response);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setOrders([]);
          toast.error(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingOrders(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTab, token]);

  useEffect(() => {
    if (activeTab !== 'account-details' && activeTab !== 'addresses') {
      return;
    }

    if (!token) {
      setSavedAddresses([]);
      setIsLoadingAddresses(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingAddresses(true);

    apiRequest<AccountAddress[]>('/api/auth/addresses', { token })
      .then((response) => {
        if (!isCancelled) {
          setSavedAddresses(response);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setSavedAddresses([]);
          toast.error(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingAddresses(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTab, token]);

  const syncStoredSession = (updatedUser: UpdatedProfileResponse) => {
    const storedSessionRaw = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!storedSessionRaw) {
      return;
    }

    try {
      const storedSession = JSON.parse(storedSessionRaw) as Record<string, unknown>;

      const nextSession = {
        ...storedSession,
        id: updatedUser.id,
        name: updatedUser.name,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        avatar: updatedUser.avatar || '',
      };

      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const updateProfileField =
    (field: keyof ProfileFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setProfileForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleCancelOrder = async (orderId: string) => {
    if (!token) {
      toast.error('Please sign in again.');
      return;
    }

    try {
      setCancellingOrderId(orderId);
      const updatedOrder = await apiRequest<AccountOrder>(
        `/api/orders/${encodeURIComponent(orderId)}/cancel`,
        {
          method: 'PUT',
          token,
        }
      );
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order._id === updatedOrder._id ? updatedOrder : order))
      );
      toast.success('Order cancelled successfully');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleRemoveSavedAddress = async (addressId: string) => {
    if (!token) {
      toast.error('Please sign in again.');
      return;
    }

    try {
      setRemovingAddressId(addressId);
      await apiRequest(`/api/auth/addresses/${encodeURIComponent(addressId)}`, {
        method: 'DELETE',
        token,
      });
      setSavedAddresses((currentAddresses) =>
        currentAddresses.filter((address) => address.id !== addressId)
      );
      toast.success('Saved address removed');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRemovingAddressId(null);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const openEditModal = () => {
    setProfileForm({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone,
      password: '',
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (!isSavingProfile) {
      setIsEditModalOpen(false);
    }
  };

  const handleProfileIconClick = () => {
    setIsPhotoMenuOpen((current) => !current);
  };

  const handleRemoveProfilePhoto = async () => {
    if (!token) {
      toast.error('Please sign in again.');
      return;
    }

    try {
      setIsUploadingPhoto(true);

      const updatedUser = await apiRequest<UpdatedProfileResponse>('/api/auth/profile/avatar', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          removeAvatar: true,
        }),
      });

      setProfileImage('');
      syncStoredSession(updatedUser);
      setIsPhotoMenuOpen(false);
      toast.success('Profile picture removed');
      window.location.reload();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleTakePhoto = () => {
    cameraInputRef.current?.click();
    setIsPhotoMenuOpen(false);
  };

  const handleBrowsePhoto = () => {
    fileInputRef.current?.click();
    setIsPhotoMenuOpen(false);
  };

  const handleProfileImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!token) {
      toast.error('Please sign in again.');
      event.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onloadend = async () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        event.target.value = '';
        return;
      }

      try {
        setIsUploadingPhoto(true);

        const updatedUser = await apiRequest<UpdatedProfileResponse>('/api/auth/profile/avatar', {
          method: 'PUT',
          token,
          body: JSON.stringify({
            avatar: result,
          }),
        });

        setProfileImage(updatedUser.avatar || result);
        syncStoredSession(updatedUser);
        toast.success('Profile picture updated successfully');
        window.location.reload();
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setIsUploadingPhoto(false);
        event.target.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async (event: FormEvent) => {
    event.preventDefault();

    if (!token) {
      toast.error('Please sign in again.');
      return;
    }

    if (!profileForm.phone.startsWith('+94')) {
      toast.error('Phone number must start with +94');
      return;
    }

    setIsSavingProfile(true);

    try {
      const updatedUser = await apiRequest<UpdatedProfileResponse>('/api/auth/profile', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          email: profileForm.email.trim(),
          phone: profileForm.phone.trim(),
          password: profileForm.password,
        }),
      });

      syncStoredSession(updatedUser);

      toast.success('Profile updated successfully');
      setIsEditModalOpen(false);
      window.location.reload();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const renderOrdersPanel = (title: 'My Orders' | 'Order History') => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-6 pb-0 md:p-8 md:pb-0">
        <h2 className="text-2xl font-bold text-primary">{title}</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        {isLoadingOrders ? (
          <div className="py-10 text-center text-body">Loading orders...</div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="rounded-xl border border-subtle/30 p-6">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-primary">{order._id}</h3>
                    <p className="text-sm text-muted">Placed on {formatOrderDate(order.createdAt)}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold text-primary">
                      {formatCurrency(order.total, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>

                    <Badge variant={getOrderStatusVariant(order.status)}>{order.status}</Badge>
                  </div>
                </div>

                <div className="space-y-3 border-t border-subtle/20 pt-4">
                  {order.items.map((item, index) => {
                    const imageSrc = getOrderItemImage(item);
                    const quantity = Math.max(1, Number(item.quantity) || 1);
                    const lineTotal = getOrderItemLineTotal(item);

                    return (
                      <div
                        key={`${order._id}-${item.product?._id || item.product?.id || index}`}
                        className="flex items-center gap-4"
                      >
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-subtle/20 bg-elevated">
                          {imageSrc ? (
                            <img
                              src={imageSrc}
                              alt={item.product?.name || 'Ordered product'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 font-medium text-primary">
                            {item.product?.name || 'Product unavailable'}
                          </p>
                          <p className="line-clamp-1 text-sm text-muted">
                            {item.product?.brand || 'Product details unavailable'}
                          </p>
                          <p className="mt-1 text-sm text-body">Qty: {quantity}</p>
                        </div>

                        <span className="whitespace-nowrap text-sm font-medium text-primary">
                          {formatCurrency(lineTotal, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-subtle/30 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-body">{getOrderItemCount(order.items)} item(s)</span>

                  <Button
                    variant={isOrderCancellable(order.status) ? 'danger' : 'outline'}
                    size="sm"
                    onClick={() => handleCancelOrder(order._id)}
                    disabled={cancellingOrderId === order._id || !isOrderCancellable(order.status)}
                  >
                    {order.status === 'cancelled'
                      ? 'Cancelled'
                      : cancellingOrderId === order._id
                        ? 'Cancelling...'
                        : 'Cancel Order'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-subtle/30 p-6 text-body">
            You have not placed any orders yet.
          </div>
        )}
      </div>
    </div>
  );

  const renderActivePanel = () => {
    if (activeTab === 'account-details') {
      return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-6 pb-0 md:p-8 md:pb-0">
            <h2 className="text-2xl font-bold text-primary">Personal Information</h2>

            <Button onClick={openEditModal}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit User Details
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <div className="grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-2">
              <Input label="First Name" value={profileData.firstName} readOnly />
              <Input label="Last Name" value={profileData.lastName} readOnly />
              <Input
                label="Email Address"
                type="email"
                value={profileData.email}
                className="md:col-span-2"
                readOnly
              />
              <Input
                label="Phone Number"
                type="tel"
                value={profileData.phone}
                className="md:col-span-2"
                readOnly
              />
            </div>

            <div className="mt-8">
              <h3 className="text-2xl font-bold text-primary">Saved Addresses</h3>
            </div>

            <div className="mt-6">
              {isLoadingAddresses ? (
                <div className="py-10 text-center text-body">Loading addresses...</div>
              ) : savedAddresses.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {savedAddresses.map((address, index) => (
                    <div
                      key={address.id}
                      className={`relative rounded-xl p-6 ${
                        address.isDefault || index === 0
                          ? 'border border-accent-gold'
                          : 'border border-subtle/30'
                      }`}
                    >
                      {(address.isDefault || index === 0) && (
                        <Badge variant="gold" className="absolute right-4 top-4">
                          Default
                        </Badge>
                      )}

                      <h3 className="mb-2 font-bold text-primary">{address.fullName}</h3>

                      <p className="text-sm leading-relaxed text-body">
                        {address.street}
                        <br />
                        {address.city}, {address.state} {address.zip}
                        {address.country ? (
                          <>
                            <br />
                            {address.country}
                          </>
                        ) : null}
                        {address.phone ? (
                          <>
                            <br />
                            {address.phone}
                          </>
                        ) : null}
                      </p>

                      <div className="mt-4 flex justify-end border-t border-subtle/20 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveSavedAddress(address.id)}
                          disabled={removingAddressId === address.id}
                        >
                          {removingAddressId === address.id ? 'Removing...' : 'Remove'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-subtle/30 p-6 text-body">
                  No saved addresses yet. Your completed checkout addresses will appear here.
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'my-orders') {
      return renderOrdersPanel('My Orders');
    }

    if (activeTab === 'order-history') {
      return renderOrdersPanel('Order History');
    }

    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="p-6 pb-0 md:p-8 md:pb-0">
          <h2 className="text-2xl font-bold text-primary">Card Details</h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="rounded-xl border border-subtle/30 p-6 text-body">
            No saved card details yet.
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="h-[calc(100vh-5rem)] overflow-hidden">
        <div className="mx-auto h-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-8 md:flex-row">
              <div className="min-h-0 flex-shrink-0 md:h-full md:w-64">
                <Card className="flex min-h-0 flex-col overflow-hidden md:h-full">
                  <div className="border-b border-subtle/30 p-6 text-center">
                    <div className="relative inline-block" ref={photoMenuRef}>
                      <button
                        type="button"
                        onClick={handleProfileIconClick}
                        disabled={isUploadingPhoto}
                        className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-accent-blue/30 bg-accent-blue/20 disabled:opacity-70"
                      >
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt="Profile"
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-10 w-10 text-accent-blue" />
                        )}
                      </button>

                      {isPhotoMenuOpen && (
                        <div className="absolute left-1/2 z-20 mt-1 w-52 -translate-x-1/2 overflow-hidden rounded-xl border border-subtle/30 bg-background shadow-lg">
                          <button
                            type="button"
                            onClick={handleRemoveProfilePhoto}
                            className="w-full px-4 py-3 text-left text-sm text-body transition-colors hover:bg-elevated"
                          >
                            Remove Profile Picture
                          </button>

                          <button
                            type="button"
                            onClick={handleTakePhoto}
                            className="w-full px-4 py-3 text-left text-sm text-body transition-colors hover:bg-elevated"
                          >
                            Take Photo
                          </button>

                          <button
                            type="button"
                            onClick={handleBrowsePhoto}
                            className="w-full px-4 py-3 text-left text-sm text-body transition-colors hover:bg-elevated"
                          >
                            Browse From Computer
                          </button>
                        </div>
                      )}

                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={handleProfileImageChange}
                      />

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfileImageChange}
                      />
                    </div>

                    <h3 className="font-bold text-primary">{profileData.fullName}</h3>
                    <p className="text-sm text-muted">{profileData.email}</p>
                  </div>

                  <nav className="flex-1 p-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          if (tab.id === 'sign-out') {
                            handleLogout();
                            return;
                          }

                          setActiveTab(tab.id);
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                          tab.id === 'sign-out'
                            ? 'text-status-error hover:bg-status-error/10'
                            : activeTab === tab.id
                              ? 'bg-accent-gold/10 text-accent-gold'
                              : 'text-body hover:bg-elevated hover:text-primary'
                        }`}
                      >
                        <tab.icon className="h-5 w-5" />
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </Card>
              </div>

              <div className="min-h-0 flex-1">
                <Card className="flex h-full min-h-0 flex-col overflow-hidden">
                  {renderActivePanel()}
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-subtle/30 bg-surface shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-subtle/30 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-primary">Edit User Details</h2>
                <p className="mt-1 text-sm text-muted">
                  Update your profile information using your current password.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSavingProfile}
                className="rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-primary disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProfileUpdate}>
              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                <Input
                  label="First Name"
                  value={profileForm.firstName}
                  onChange={updateProfileField('firstName')}
                  required
                />
                <Input
                  label="Last Name"
                  value={profileForm.lastName}
                  onChange={updateProfileField('lastName')}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  className="md:col-span-2"
                  value={profileForm.email}
                  onChange={updateProfileField('email')}
                  required
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  className="md:col-span-2"
                  value={profileForm.phone}
                  onChange={updateProfileField('phone')}
                  required
                />
                <Input
                  label="Enter Password to confirm"
                  type="password"
                  className="md:col-span-2"
                  value={profileForm.password}
                  onChange={updateProfileField('password')}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-subtle/30 bg-surface px-6 py-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditModal}
                  disabled={isSavingProfile}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSavingProfile}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
