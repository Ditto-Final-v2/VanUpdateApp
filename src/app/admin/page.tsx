import Link from "next/link";
import { FileText, MessageCircle, Plus, Users } from "lucide-react";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";
const stats = [["Published posts", "6", FileText], ["Pending comments", "3", MessageCircle], ["Subscribers", "128", Users]] as const;
export default function AdminPage() { return <AdminPlaceholder title="Trip desk" description="A mobile-first overview for publishing from the road."><div className="mt-9 grid gap-4 sm:grid-cols-3">{stats.map(([label, value, Icon]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><Icon className="text-sage" size={20}/><p className="mt-4 font-serif text-3xl font-semibold text-forest">{value}</p><p className="text-sm text-stone-500">{label}</p></div>)}</div><Link href="/admin/posts/new" className="button-primary mt-6 gap-2"><Plus size={17}/>New entry</Link></AdminPlaceholder>; }
