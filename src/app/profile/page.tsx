'use client';

import AuthGuard from '@/components/AuthGuard';
import ProfileForm from '@/components/profile/ProfileForm';

function ProfilePageContent() {
  return (
    <div className="container mx-auto py-8">
      <ProfileForm />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfilePageContent />
    </AuthGuard>
  );
}
