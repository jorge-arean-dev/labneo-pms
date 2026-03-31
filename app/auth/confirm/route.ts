import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

/**
 * Determines the redirect URL based on the email OTP type
 * - invite: New user setting password for first time → /auth/set-password
 * - recovery: Existing user resetting password → /auth/reset-password
 * - other types: Use the 'next' parameter or default to home
 */
function getRedirectUrl(type: EmailOtpType, next: string): string {
  switch (type) {
    case "invite":
      return "/auth/set-password";
    case "recovery":
      return "/auth/reset-password";
    default:
      return next;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // Redirect based on token type
      const redirectUrl = getRedirectUrl(type, next);
      redirect(redirectUrl);
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${encodeURIComponent(error?.message)}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=${encodeURIComponent("No token hash or type")}`);
}
