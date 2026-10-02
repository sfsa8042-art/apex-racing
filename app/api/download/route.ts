import { NextRequest, NextResponse } from "next/server";

const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "sfsa8042-art/apex-racing";
const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases`;

interface Asset {
  name: string;
  browser_download_url: string;
  size: number;
}
interface Release {
  tag_name: string;
  prerelease: boolean;
  assets: Asset[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "exe"; // exe | msi | info

  // ── No repo configured → instructions page ──────────────────────────────
  if (!GITHUB_REPO) {
    if (format === "info") {
      return NextResponse.json({
        error: "NEXT_PUBLIC_GITHUB_REPO not configured",
        setup: "Set NEXT_PUBLIC_GITHUB_REPO=owner/repo in your environment",
      }, { status: 503 });
    }
    return NextResponse.redirect(
      new URL("/download?error=not_configured", req.url)
    );
  }

  try {
    // ── Fetch releases from GitHub ──────────────────────────────────────────
    const res = await fetch(RELEASES_API, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const releases: Release[] = await res.json();

    // Prefer stable release, fall back to pre-release
    const release =
      releases.find(r => !r.prerelease && r.assets.length > 0) ??
      releases.find(r => r.assets.length > 0);

    if (!release) {
      return NextResponse.redirect(
        new URL(`/download?error=no_release`, req.url)
      );
    }

    // ── Return JSON info ───────────────────────────────────────────────────
    if (format === "info") {
      const exe = release.assets.find(
        a => a.name.endsWith(".exe") && !a.name.includes("debug")
      );
      const msi = release.assets.find(a => a.name.endsWith(".msi"));
      return NextResponse.json({
        version: release.tag_name,
        exe: exe
          ? { name: exe.name, url: exe.browser_download_url, size: exe.size }
          : null,
        msi: msi
          ? { name: msi.name, url: msi.browser_download_url, size: msi.size }
          : null,
      });
    }

    // ── Find the right asset ───────────────────────────────────────────────
    const asset =
      format === "msi"
        ? release.assets.find(a => a.name.endsWith(".msi"))
        : release.assets.find(
            a => a.name.endsWith(".exe") && !a.name.includes("debug")
          ) ?? release.assets.find(a => a.name.endsWith(".msi"));

    if (!asset) {
      return NextResponse.redirect(
        new URL(`/download?error=no_asset&format=${format}`, req.url)
      );
    }

    // ── 302 redirect → direct GitHub download ────────────────────────────
    return NextResponse.redirect(asset.browser_download_url, { status: 302 });
  } catch (err) {
    console.error("[/api/download] Error:", err);
    return NextResponse.redirect(
      new URL(`/download?error=fetch_failed`, req.url)
    );
  }
}
