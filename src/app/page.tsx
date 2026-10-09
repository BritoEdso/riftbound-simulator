import { redirect } from "next/navigation";

// The trials are the app's front door for now.
export default function Home() {
  redirect("/scenarios");
}
