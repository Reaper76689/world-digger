import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

const signSchema = z.object({
  fileName: z.string().min(1).max(160),
  fileType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024)
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = signSchema.parse(await request.json());
    const ext = input.fileType.split("/")[1].replace("jpeg", "jpg");
    const key = `uploads/${user.id}/${crypto.randomUUID()}.${ext}`;
    const publicBase = process.env.S3_PUBLIC_BASE_URL;
    const bucket = process.env.S3_BUCKET;
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    if (publicBase && bucket && endpoint && accessKeyId && secretAccessKey) {
      const client = new S3Client({
        region: process.env.S3_REGION ?? "auto",
        endpoint,
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey }
      });
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: input.fileType,
        ContentLength: input.fileSize
      });

      return Response.json({
        upload: {
          key,
          method: "PUT",
          url: await getSignedUrl(client, command, { expiresIn: 300 }),
          publicUrl: `${publicBase.replace(/\/$/, "")}/${key}`,
          mockOnly: false
        }
      });
    }

    return Response.json({
      upload: {
        key,
        method: "PUT",
        url: publicBase ? `${publicBase.replace(/\/$/, "")}/${key}` : null,
        publicUrl: publicBase ? `${publicBase.replace(/\/$/, "")}/${key}` : null,
        mockOnly: !publicBase
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
