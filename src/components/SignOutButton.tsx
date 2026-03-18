"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-gray-500 hover:text-gray-700"
    >
      Sign Out
    </button>
  );
}
