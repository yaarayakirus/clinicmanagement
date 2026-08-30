import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth";
import { upsertUserFromSession } from "@/server/clinic-service";

export type AuthenticatedUser = {
  id: string;
  googleSubjectId: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !session.user.googleSubjectId) {
    redirect("/");
  }

  return upsertUserFromSession({
    googleSubjectId: session.user.googleSubjectId,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  });
}
