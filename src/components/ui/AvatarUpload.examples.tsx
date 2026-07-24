import { useState } from "react";

import { Row } from "../layout/Row";

import { AvatarUpload } from "./AvatarUpload";
import { Text } from "./Text";

/** The canonical usage: current avatar, display name, and an `onUpload` that
 *  POSTs the file and returns the URL to persist. */
export function Minimal() {
  return (
    <AvatarUpload
      src="https://cdn.example.com/avatars/ada-lovelace.jpg"
      name="Ada Lovelace"
      onUpload={async (file) => {
        const body = new FormData();
        body.append("avatar", file);
        const res = await fetch("/api/profile/avatar", { method: "POST", body });
        if (!res.ok) throw new Error("Could not save your photo. Try again.");
        return (await res.json()) as { url: string };
      }}
    />
  );
}

/** Five fixed sizes, `xl` by default. The camera glyph and the busy spinner stay
 *  16px at every size, so they crowd the two smallest circles. */
export function Sizes() {
  return (
    <>
      <AvatarUpload size="xs" name="Ada Lovelace" />
      <AvatarUpload size="sm" name="Ada Lovelace" />
      <AvatarUpload size="md" name="Ada Lovelace" />
      <AvatarUpload size="lg" name="Ada Lovelace" />
      <AvatarUpload size="xl" name="Ada Lovelace" />
    </>
  );
}

/** `accept` is matched by exact MIME string, so list every type you allow —
 *  a wildcard like `"image/*"` reaches the OS picker but fails validation. */
export function Validation() {
  return (
    <AvatarUpload
      name="Grace Hopper"
      accept={["image/jpeg", "image/png", "image/webp"]}
      maxSize={2 * 1024 * 1024}
      onUpload={async (file) => {
        const res = await fetch("/api/profile/avatar", { method: "POST", body: file });
        return (await res.json()) as { url: string };
      }}
    />
  );
}

/** `onUploadComplete` on resolve, `onUploadError` on a rejected promise or a failed
 *  `accept`/`maxSize` check — routed into your own live region, held in `status` state. */
export function Callbacks() {
  const [status, setStatus] = useState("");

  return (
    <>
      <AvatarUpload
        src="https://cdn.example.com/avatars/grace-hopper.jpg"
        name="Grace Hopper"
        accept={["image/jpeg", "image/png"]}
        onUpload={async (file) => {
          const res = await fetch("/api/profile/avatar", { method: "POST", body: file });
          if (!res.ok) throw new Error(`Upload failed (${String(res.status)}).`);
          return (await res.json()) as { url: string };
        }}
        onUploadComplete={() => setStatus("Profile photo updated.")}
        onUploadError={(error) => setStatus(error.message)}
      />
      <Text variant="body-3" color="secondary" role="status">
        {status}
      </Text>
    </>
  );
}

/** A profile settings row: the picker beside the label and the limits it enforces. */
export function InSettingsRow() {
  return (
    <Row gap="r4" align="center">
      <AvatarUpload
        src="https://cdn.example.com/avatars/ada-lovelace.jpg"
        name="Ada Lovelace"
        accept={["image/jpeg", "image/png"]}
        maxSize={2 * 1024 * 1024}
        onUpload={async (file) => {
          const res = await fetch("/api/profile/avatar", { method: "POST", body: file });
          return (await res.json()) as { url: string };
        }}
      />
      <div>
        <Text variant="body-2" weight="semibold">
          Profile photo
        </Text>
        <Text variant="body-3" color="secondary">
          JPEG or PNG, up to 2 MB.
        </Text>
      </div>
    </Row>
  );
}
