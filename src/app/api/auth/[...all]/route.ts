import { getAuth } from "@/lib/auth";
import { configured } from "@/lib/config";
async function handler(request: Request) {
  if (!configured())
    return Response.json(
      { message: "Finish deployment setup to enable authentication." },
      { status: 503 },
    );
  return getAuth().handler(request);
}
export { handler as GET, handler as POST };
