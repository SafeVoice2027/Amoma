import { Card, PageHeader, Button } from "@/components/ui";
import Link from "next/link";

export default function PendingApprovalPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--color-primary-50)] px-4 py-16">
      <div className="w-full max-w-md">
        <Card>
          <PageHeader
            title="Your account is awaiting approval"
            subtitle="A school admin needs to approve your account before you can log in. This usually doesn't take long — please check back soon."
          />
          <Link href="/login">
            <Button variant="secondary" className="w-full">
              Back to log in
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
