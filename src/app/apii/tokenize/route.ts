import type { NextRequest } from "next/server";
import { encode } from "~/pages/api/v1/encode";

export async function GET(req: NextRequest) {
  try {
    const result = await encode('gpt-4o', 'lorem ipsum dolor sit amet');
    return Response.json(result);
  } catch (error) {
    return Response.json({
      error: "Error processing request",
    })
  }
}
