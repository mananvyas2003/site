import { redirect } from "next/navigation";

/**
 * The service worker normally intercepts the share sheet's POST before it ever
 * reaches the network. This exists for the first share after install, when the
 * worker isn't controlling the page yet — landing on /new with nothing
 * attached beats a 404.
 */
export default function ShareTarget() {
  redirect("/new");
}
