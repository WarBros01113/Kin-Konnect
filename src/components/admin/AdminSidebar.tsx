
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Network, // Changed from GitNetwork
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/members', label: 'Member Management', icon: Network },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground p-4 space-y-2 border-r border-sidebar-border flex flex-col">
      <div className="mb-4">
        <Link href="/admin/dashboard" className="flex items-center space-x-2 group">
          <ShieldCheck className="h-8 w-8 text-sidebar-primary group-hover:text-sidebar-primary/80 transition-colors" />
          <h1 className="text-2xl font-headline font-bold text-sidebar-primary group-hover:text-sidebar-primary/80 transition-colors">
            KinKonnect Admin
          </h1>
        </Link>
      </div>
      <nav className="flex-grow">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <Button
                variant={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin/dashboard') ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  (pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin/dashboard'))
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90'
                    : 'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto">
        <Button variant="outline" className="w-full border-sidebar-border hover:bg-sidebar-accent/50" asChild>
            <Link href="/dashboard">Back to App</Link>
        </Button>
      </div>
    </aside>
  );
}
