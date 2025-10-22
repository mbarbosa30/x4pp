import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Mail,
  DollarSign,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  totalMessages: number;
  totalRevenue: string;
  messageStats: {
    pending: number;
    opened: number;
    replied: number;
    refunded: number;
  };
  paymentStats: {
    settled: number;
    refunded: number;
    totalPaid: string;
    totalRefunded: string;
  };
}

interface User {
  id: string;
  username: string;
  displayName: string;
  basePrice: string;
  slotsPerWindow: number;
  timeWindow: string;
  verified: boolean;
  walletAddress: string | null;
}

interface Message {
  id: string;
  senderNullifier: string | null;
  recipientNullifier: string | null;
  amount: string;
  sentAt: string;
  openedAt: string | null;
  repliedAt: string | null;
  refundedAt: string | null;
}

interface Payment {
  id: string;
  sender: string;
  recipient: string;
  amount: string;
  status: string;
  txHash: string | null;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['/api/admin/stats'],
  });

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: activeTab === "users",
  });

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/admin/messages'],
    enabled: activeTab === "messages",
  });

  // Fetch payments
  const { data: payments, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ['/api/admin/payments'],
    enabled: activeTab === "payments",
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, messages, and payments</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="messages" data-testid="tab-messages">Messages</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {statsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading statistics...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-3xl font-bold" data-testid="stat-total-users">{stats?.totalUsers || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Messages</p>
                      <p className="text-3xl font-bold" data-testid="stat-total-messages">{stats?.totalMessages || 0}</p>
                    </div>
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-3xl font-bold" data-testid="stat-total-revenue">${stats?.totalRevenue || '0.00'}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-success" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Verified Users</p>
                      <p className="text-3xl font-bold" data-testid="stat-verified-users">{stats?.verifiedUsers || 0}</p>
                    </div>
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Message Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pending</span>
                      <Badge variant="outline">{stats?.messageStats?.pending || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Opened</span>
                      <Badge variant="outline">{stats?.messageStats?.opened || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Replied</span>
                      <Badge variant="outline">{stats?.messageStats?.replied || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Refunded</span>
                      <Badge variant="outline">{stats?.messageStats?.refunded || 0}</Badge>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Payment Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Settled</span>
                      <Badge variant="outline">{stats?.paymentStats?.settled || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Refunded</span>
                      <Badge variant="outline">{stats?.paymentStats?.refunded || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Paid</span>
                      <span className="font-semibold">${stats?.paymentStats?.totalPaid || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Refunded</span>
                      <span className="font-semibold">${stats?.paymentStats?.totalRefunded || '0.00'}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">All Users</h3>
            {usersLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Slots</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Wallet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users && users.length > 0 ? (
                    users.map((user: any) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.username}`}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.displayName}</TableCell>
                        <TableCell>${parseFloat(user.basePrice).toFixed(2)}</TableCell>
                        <TableCell>{user.slotsPerWindow}/{user.timeWindow}</TableCell>
                        <TableCell>
                          {user.verified ? (
                            <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                          ) : (
                            <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Unverified</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'Not set'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">All Messages</h3>
            {messagesLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading messages...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages && messages.length > 0 ? (
                    messages.map((msg: any) => (
                      <TableRow key={msg.id} data-testid={`row-message-${msg.id}`}>
                        <TableCell className="font-mono text-xs">{msg.id.slice(0, 8)}...</TableCell>
                        <TableCell className="font-mono text-xs">{msg.senderNullifier?.slice(0, 12)}...</TableCell>
                        <TableCell className="font-mono text-xs">{msg.recipientNullifier?.slice(0, 12)}...</TableCell>
                        <TableCell>${parseFloat(msg.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          {msg.refundedAt ? (
                            <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Refunded</Badge>
                          ) : msg.repliedAt ? (
                            <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Replied</Badge>
                          ) : msg.openedAt ? (
                            <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Opened</Badge>
                          ) : (
                            <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(msg.sentAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No messages found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">All Payments</h3>
            {paymentsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading payments...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>TX Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments && payments.length > 0 ? (
                    payments.map((payment: any) => (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}...</TableCell>
                        <TableCell className="font-mono text-xs">{payment.sender?.slice(0, 6)}...{payment.sender?.slice(-4)}</TableCell>
                        <TableCell className="font-mono text-xs">{payment.recipient?.slice(0, 6)}...{payment.recipient?.slice(-4)}</TableCell>
                        <TableCell>${parseFloat(payment.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          {payment.status === 'settled' ? (
                            <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Settled</Badge>
                          ) : payment.status === 'refunded' ? (
                            <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Refunded</Badge>
                          ) : (
                            <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />{payment.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {payment.txHash ? (
                            <a 
                              href={`https://celoscan.io/tx/${payment.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {payment.txHash.slice(0, 6)}...{payment.txHash.slice(-4)}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No payments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
