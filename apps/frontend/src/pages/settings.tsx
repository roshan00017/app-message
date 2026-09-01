import { useState } from 'react';
import { Bell, Shield, User, Moon, Globe, Palette } from 'lucide-react';

import { AppLayout } from '@/components/layout/app-layout';
import { CustomerLayout } from '@/components/layout/customer-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { usePushNotifications } from '@/hooks/use-push-notifications';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function SettingItem({ icon, title, description, action }: SettingItemProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [themeOpen, setThemeOpen] = useState(false);
  const { theme } = useThemeStore();
  const { isSupported, permission, isSubscribed, requestPermission, unsubscribe } = usePushNotifications();

  const Layout = user?.role === 'user' ? CustomerLayout : AppLayout;

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="mx-auto max-w-2xl space-y-8">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Profile</CardTitle>
                  <CardDescription>Your account information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.avatar ?? undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-lg text-white">
                    {user?.name ? getInitials(user.name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground capitalize">
                    Role: {user?.role}
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Notifications</CardTitle>
                  <CardDescription>Manage your notification preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <SettingItem
                icon={<Bell className="h-4 w-4 text-muted-foreground" />}
                title="Push Notifications"
                description={
                  !isSupported
                    ? 'Not supported in this browser'
                    : permission === 'denied'
                      ? 'Permission denied'
                      : isSubscribed
                        ? 'Enabled'
                        : 'Receive notifications for new messages'
                }
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isSubscribed ? unsubscribe : requestPermission}
                    disabled={!isSupported || permission === 'denied'}
                  >
                    {isSubscribed ? 'Disable' : 'Enable'}
                  </Button>
                }
              />
              <SettingItem
                icon={<Globe className="h-4 w-4 text-muted-foreground" />}
                title="Email Notifications"
                description="Receive email for important updates"
                action={
                  <Button variant="outline" size="sm">
                    Enable
                  </Button>
                }
              />
            </CardContent>
          </Card>

          {/* Appearance Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Appearance</CardTitle>
                  <CardDescription>Customize the look and feel</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <SettingItem
                icon={<Moon className="h-4 w-4 text-muted-foreground" />}
                title="Theme"
                description={`Currently: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
                action={
                  <Button variant="outline" size="sm" onClick={() => setThemeOpen(true)}>
                    Change
                  </Button>
                }
              />
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Security</CardTitle>
                  <CardDescription>Manage your security settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <SettingItem
                icon={<Shield className="h-4 w-4 text-muted-foreground" />}
                title="Change Password"
                description="Update your account password"
                action={
                  <Button variant="outline" size="sm">
                    Change
                  </Button>
                }
              />
              <Separator />
              <SettingItem
                icon={<Shield className="h-4 w-4 text-muted-foreground" />}
                title="Two-Factor Authentication"
                description="Add an extra layer of security"
                action={
                  <Button variant="outline" size="sm">
                    Setup
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <ThemeToggle open={themeOpen} onOpenChange={setThemeOpen} />
    </Layout>
  );
}
