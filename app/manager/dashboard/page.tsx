"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsCheck2Circle, BsXCircle, BsCashStack, BsBank2, BsPaypal, BsCreditCard } from 'react-icons/bs';
import { FaBitcoin } from 'react-icons/fa';
import { SiVisa } from 'react-icons/si';
import { useWithdrawalManagement, WithdrawalRequest } from '@/app/hooks/useWithdrawalManagement';
import { toast } from 'react-hot-toast';
import { ID } from 'appwrite';
import { database } from '@/libs/AppWriteClient';
import process from 'process';
import { Query } from 'appwrite';

interface PaymentCard {
  user_id: string;
  amount: string;
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
  payment_method: string;
  payment_details: {
    bank_name?: string;
    account_number?: string;
    holder_name?: string;
    email?: string;
  };
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: 'approve' | 'reject';
  amount: number;
  userName: string;
}

const ConfirmModal = ({ isOpen, onClose, onConfirm, type, amount, userName }: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-[#272B43] rounded-xl p-6 max-w-md w-full border border-[#3f2d63]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-4">
          {type === 'approve' ? (
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <BsCheck2Circle size={32} className="text-green-500" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <BsXCircle size={32} className="text-red-500" />
            </div>
          )}
          
          <h3 className="text-xl font-bold text-white text-center">
            {type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
          </h3>
          
          <p className="text-[#818BAC] text-center">
            {type === 'approve' 
              ? `Are you sure you want to approve the withdrawal of $${amount} for ${userName}?`
              : `Are you sure you want to reject the withdrawal of $${amount} for ${userName}?`
            }
          </p>
          
          <div className="flex gap-4 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#3f2d63]/20 text-[#818BAC] rounded-lg hover:bg-[#3f2d63]/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                type === 'approve'
                  ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                  : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
              }`}
            >
              {type === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const getDocumentId = (withdrawal: WithdrawalRequest): string => {
  return withdrawal.$id || withdrawal.id || ID.unique();
};

// Helper function to extract bank details regardless of format
const getBankDetails = (withdrawal: WithdrawalRequest) => {
  try {
    // Handle bank transfer details
    if (withdrawal.method === 'bank_transfer' || withdrawal.withdrawal_method === 'bank_transfer') {
      let parsedBankDetails: any = {};
      
      if (withdrawal.bankDetails) {
        try {
          parsedBankDetails = typeof withdrawal.bankDetails === 'string' 
            ? JSON.parse(withdrawal.bankDetails)
            : withdrawal.bankDetails;
            
          console.log('Bank details:', parsedBankDetails); // Debug log
        } catch (e) {
          console.error('Failed to parse bank details:', e);
        }
      }

      return {
        bankName: parsedBankDetails?.bank_name || null,
        accountNumber: parsedBankDetails?.account_number || null,
        holderName: parsedBankDetails?.account_holder || null,
        swiftBic: parsedBankDetails?.swift_bic || null,
        bankAddress: parsedBankDetails?.bank_address || null,
        iban: parsedBankDetails?.iban || null,
        routingNumber: parsedBankDetails?.routing_number || null
      };
    }
    
    // Handle card details
    if (withdrawal.method === 'card' || withdrawal.withdrawal_method === 'card') {
      let parsedCardDetails: any = {};
      
      if (withdrawal.cardDetails) {
        // If cardDetails is a string, try to parse it as JSON
        if (typeof withdrawal.cardDetails === 'string') {
          try {
            parsedCardDetails = JSON.parse(withdrawal.cardDetails);
          } catch (e) {
            console.error('Failed to parse card details string:', e);
            // Try to parse withdrawal_details as fallback
            if (withdrawal.withdrawal_details) {
              try {
                const details = typeof withdrawal.withdrawal_details === 'string'
                  ? JSON.parse(withdrawal.withdrawal_details)
                  : withdrawal.withdrawal_details;
                if (details.visa_card) {
                  parsedCardDetails = details.visa_card;
                }
              } catch (e) {
                console.error('Failed to parse withdrawal_details:', e);
              }
            }
          }
        } else {
          // If it's already an object, use it directly
          parsedCardDetails = withdrawal.cardDetails;
        }
      } else if (withdrawal.withdrawal_details) {
        // Try withdrawal_details if cardDetails is not available
        try {
          const details = typeof withdrawal.withdrawal_details === 'string'
            ? JSON.parse(withdrawal.withdrawal_details)
            : withdrawal.withdrawal_details;
          if (details.visa_card) {
            parsedCardDetails = details.visa_card;
          }
      } catch (e) {
          console.error('Failed to parse withdrawal_details:', e);
        }
      }
      
      return {
        cardNumber: parsedCardDetails.card_number || parsedCardDetails.cardNumber || null,
        cardExpiry: parsedCardDetails.expiry_date || parsedCardDetails.expiry || null,
        cardHolder: parsedCardDetails.card_holder || parsedCardDetails.holderName || null,
        cardCVV: parsedCardDetails.cvv || null,
        cardType: 'Visa'
      };
    }
    
    // Return default empty values if no details found
    return {
      bankName: null,
      accountNumber: null,
      holderName: null,
      cardNumber: null,
      cardExpiry: null,
      cardHolder: null,
      cardCVV: null,
      cardType: null
    };
  } catch (error) {
    console.error('Error processing payment details:', error);
    return {
      bankName: null,
      accountNumber: null,
      holderName: null,
      cardNumber: null,
      cardExpiry: null,
      cardHolder: null,
      cardCVV: null,
      cardType: null
    };
  }
};

export default function ManagerDashboard() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject';
    withdrawalId: string;
    userId: string;
    amount: number;
    userName: string;
  }>({
    isOpen: false,
    type: 'approve',
    withdrawalId: '',
    userId: '',
    amount: 0,
    userName: ''
  });
  
  const { getWithdrawalRequests, processWithdrawal, isLoading } = useWithdrawalManagement();
  const [usersData, setUsersData] = useState<{[key: string]: {name: string, email: string}}>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh interval (in milliseconds)
  const REFRESH_INTERVAL = 30000; // 30 seconds

  useEffect(() => {
    // Initial load
    loadWithdrawals();
    
    // Set up periodic refresh
    const intervalId = setInterval(() => {
      loadWithdrawals(true);
    }, REFRESH_INTERVAL);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Helper function to safely fetch a user from database
  const fetchUserData = async (userId: string): Promise<{name: string, email: string}> => {
    if (!userId || userId === 'undefined' || userId === 'null') {
      return { name: 'Unknown User', email: 'No Email' };
    }
    
    try {
      // Try to get user directly by ID first (more efficient)
      try {
        const userDoc = await database.getDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_USERS!,
          userId
        );
        
        return {
          name: userDoc.name || userDoc.full_name || `User ${userId.substring(0, 8)}`,
          email: userDoc.email || userDoc.emailAddresses?.[0]?.emailAddress || 'No Email'
        };
      } catch (directFetchError) {
        console.warn(`Direct fetch failed for user ID ${userId}, trying listDocuments`, directFetchError);
        
        // Fall back to using listDocuments with a query
        const response = await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_USERS!,
          [Query.equal('$id', userId)]
        );
        
        if (response.documents.length > 0) {
          const user = response.documents[0];
          return {
            name: user.name || user.full_name || `User ${userId.substring(0, 8)}`,
            email: user.email || user.emailAddresses?.[0]?.emailAddress || 'No Email'
          };
        }
      }
      
      // If we get here, no user was found
      return {
        name: `User ${userId.substring(0, 8)}`,
        email: 'No Email'
      };
    } catch (error) {
      console.error(`Failed to fetch user data for ID ${userId}:`, error);
      return {
        name: `User ${userId.substring(0, 8)}`,
        email: 'No Email'
      };
    }
  };

  const loadWithdrawals = async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setIsRefreshing(true);
    }
    
    try {
      const requests = await getWithdrawalRequests();
      // Sort withdrawals by date (newest first)
      const sortedRequests = [...requests].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setWithdrawals(sortedRequests);
      
      // Get unique user IDs from withdrawals
      const userIds = Array.from(new Set(sortedRequests.map(w => w.userId)));
      
      // Fetch user data for each unique user ID
      const userData: {[key: string]: {name: string, email: string}} = {};
      
      // Process in batches to avoid too many concurrent requests
      const batchSize = 3; // Reduced batch size to avoid overloading
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        // Sequential processing to avoid rate limits
        for (const userId of batch) {
          if (!userId) continue;
          
          try {
            userData[userId] = await fetchUserData(userId);
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            userData[userId] = {
              name: `User ${userId.substring(0, 8)}`,
              email: 'No Email'
            };
          }
          
          // Small delay between requests to avoid rate limiting
          if (batch.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      setUsersData(userData);
      
      if (isAutoRefresh) {
        toast.success("Data refreshed", { duration: 2000 });
      }
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
      if (!isAutoRefresh) {
        toast.error('Failed to load withdrawal requests');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleProcess = async (withdrawalId: string, userId: string, status: 'approved' | 'rejected') => {
    try {
      // Show processing toast
      const loadingToast = toast.loading(`Processing ${status} request...`);
      
      // First try to fetch fresh user data before processing
      let userData: {name: string, email: string};
      try {
        userData = await fetchUserData(userId);
        // Update the local user data state
        setUsersData(prev => ({
          ...prev,
          [userId]: userData
        }));
      } catch (userError) {
        console.error('Error getting user data before processing withdrawal:', userError);
        // Continue with processing anyway
      }
      
      let retryCount = 0;
      const maxRetries = 2;
      
      const processWithRetry = async (): Promise<boolean> => {
        try {
          await processWithdrawal(withdrawalId, status, userId);
          return true;
        } catch (error: any) {
          console.error(`Attempt ${retryCount + 1} failed to ${status} withdrawal:`, error);
          
          // Check if it's a 400 error that might be temporary
          if (retryCount < maxRetries && 
              error && 
              (error.code === 400 || (error.message && error.message.includes('400')))) {
            retryCount++;
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            return processWithRetry();
          }
          
          throw error; // Re-throw if we're out of retries or it's not a retryable error
        }
      };
      
      const success = await processWithRetry();
      
      if (success) {
        // Dismiss loading toast and show success toast
        toast.dismiss(loadingToast);
        toast.success(
          status === 'approved' 
            ? 'Withdrawal request approved successfully!' 
            : 'Withdrawal request rejected successfully!',
          { duration: 4000 }
        );
        
        // Refresh the withdrawals list
        await loadWithdrawals();
      }
    } catch (error) {
      console.error(`Failed to ${status} withdrawal:`, error);
      toast.error(
        `Failed to ${status} withdrawal. ${error instanceof Error ? error.message : 'Please try again.'}`,
        { duration: 5000 }
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#1A2338] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Withdrawal Requests</h1>
            <p className="text-[#818BAC] mt-1">Manage user withdrawal requests</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-4 bg-[#272B43] p-3 rounded-xl border border-[#3f2d63]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-[#818BAC]">
                  {withdrawals.filter(w => w.status === 'pending').length} Pending
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-[#818BAC]">
                  {withdrawals.filter(w => w.status === 'approved').length} Approved
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-[#818BAC]">
                  {withdrawals.filter(w => w.status === 'rejected').length} Rejected
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <AnimatePresence>
            {withdrawals.map((withdrawal) => (
              <motion.div
                key={getDocumentId(withdrawal)}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`bg-gradient-to-br from-[#272B43] to-[#1e2235] rounded-xl p-6 
                  shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1
                  border-l-4 ${
                    withdrawal.status === 'pending' ? 'border-l-yellow-500' : 
                    withdrawal.status === 'approved' ? 'border-l-green-500' : 
                    'border-l-red-500'
                  } border border-[#3f2d63] hover:border-[#20DDBB]`}
              >
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      withdrawal.method === 'bank_transfer' 
                        ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/20 text-blue-400' 
                        : (withdrawal.method as string) === 'card'
                        ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 text-yellow-400' 
                        : (withdrawal.method as string) === 'crypto'
                        ? 'bg-gradient-to-br from-orange-500/30 to-orange-600/20 text-orange-400'
                        : 'bg-gradient-to-br from-[#20DDBB]/30 to-[#15a88c]/20 text-[#20DDBB]'
                    }`}>
                      {withdrawal.method === 'bank_transfer' 
                        ? <BsBank2 size={28} />
                        : (withdrawal.method as string) === 'card'
                        ? <SiVisa size={28} />
                        : (withdrawal.method as string) === 'crypto'
                        ? <FaBitcoin size={28} />
                        : <BsPaypal size={28} />
                      }
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="text-white font-bold text-xl">
                          ${withdrawal.amount}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          withdrawal.status === 'approved' ? 'text-green-400 bg-green-500/20 border border-green-500/30' : 
                          withdrawal.status === 'rejected' ? 'text-red-400 bg-red-500/20 border border-red-500/30' : 
                          'text-yellow-400 bg-yellow-500/20 border border-yellow-500/30'
                        }`}>
                          {withdrawal.status.toUpperCase()}
                        </span>
                        <span className="bg-gray-700/50 text-gray-300 text-xs px-2 py-1 rounded-md">
                          {withdrawal.method === 'bank_transfer' ? 'Bank Transfer' : 
                           (withdrawal.method as string) === 'card' ? 'Visa Card' :
                           (withdrawal.method as string) === 'crypto' ? 'Crypto' :
                           withdrawal.method === 'paypal' ? 'PayPal' : 
                           withdrawal.method}
                        </span>
                      </div>
                      
                      {/* Display user name and email */}
                      <div className="mb-2 py-1 px-2 -ml-2 rounded-lg bg-[#3f2d63]/15 inline-block">
                        <p className="text-[#20DDBB] text-sm font-medium flex items-center">
                          <span>{usersData[withdrawal.userId]?.name || 
                            (withdrawal.userId ? `User ${withdrawal.userId}` : 'Unknown')}</span>
                          {withdrawal.userId && (
                            <span className="ml-1 text-xs text-gray-400 bg-gray-800/40 px-1.5 py-0.5 rounded">
                              ID: {withdrawal.userId}
                            </span>
                          )}
                        </p>
                        <p className="text-[#818BAC] text-xs">
                          Email: {usersData[withdrawal.userId]?.email !== 'No Email' ? usersData[withdrawal.userId]?.email : 
                            (withdrawal.paypalEmail ? withdrawal.paypalEmail : 
                              (getBankDetails(withdrawal)?.holderName ? `Holder: ${getBankDetails(withdrawal)?.holderName}` : 'No Email'))}
                        </p>
                      </div>
                      
                      <p className="text-[#818BAC] text-sm">
                        {new Date(withdrawal.createdAt).toLocaleString()}
                      </p>
                      
                      <div className="mt-3 space-y-1.5 bg-[#1A2338]/40 p-2.5 rounded-lg">
                        {withdrawal.method === 'bank_transfer' ? (
                          <>
                            <p className="text-[#818BAC] flex items-center">
                              <span className="text-white min-w-[70px] inline-block">Bank:</span> 
                              <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1">
                                {getBankDetails(withdrawal)?.bankName || 'N/A'}
                              </span>
                            </p>
                            <p className="text-[#818BAC] flex items-center">
                              <span className="text-white min-w-[70px] inline-block">Account:</span> 
                              <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1">
                                {getBankDetails(withdrawal)?.accountNumber || 'N/A'}
                              </span>
                            </p>
                            <p className="text-[#818BAC] flex items-center">
                              <span className="text-white min-w-[70px] inline-block">Holder:</span> 
                              <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1">
                                {getBankDetails(withdrawal)?.holderName || 'N/A'}
                              </span>
                            </p>
                            <p className="text-[#818BAC] flex items-center">
                              <span className="text-white min-w-[70px] inline-block">SWIFT:</span> 
                              <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1">
                                {getBankDetails(withdrawal)?.swiftBic || 'N/A'}
                              </span>
                            </p>
                            <p className="text-[#818BAC] flex items-center">
                              <span className="text-white min-w-[70px] inline-block">IBAN:</span> 
                              <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1">
                                {getBankDetails(withdrawal)?.iban || 'N/A'}
                              </span>
                            </p>
                            <p className="text-[#818BAC] flex items-center">
                              <span className="text-white min-w-[70px] inline-block">Routing:</span> 
                              <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1">
                                {getBankDetails(withdrawal)?.routingNumber || 'N/A'}
                              </span>
                            </p>
                            <p className="text-[#818BAC] flex items-center">
                              <span className="text-white min-w-[70px] inline-block">Address:</span> 
                              <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1">
                                {getBankDetails(withdrawal)?.bankAddress || 'N/A'}
                              </span>
                            </p>
                          </>
                        ) : (withdrawal.method as string) === 'card' ? (
                          <>
                            <p className="text-[#818BAC] flex items-center">
                              <span className="text-white min-w-[70px] inline-block">Card:</span> 
                              <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1 flex items-center gap-2">
                                <SiVisa className="text-blue-400" />
                                {getBankDetails(withdrawal)?.cardNumber || 'N/A'}
                              </span>
                            </p>
                            <p className="text-[#818BAC] flex items-center">
                              <span className="text-white min-w-[70px] inline-block">Expires:</span> 
                              <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1">
                                {getBankDetails(withdrawal)?.cardExpiry || 'N/A'}
                              </span>
                            </p>
                            <p className="text-[#818BAC] flex items-center">
                              <span className="text-white min-w-[70px] inline-block">CVV:</span> 
                              <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1">
                                {getBankDetails(withdrawal)?.cardCVV || 'N/A'}
                              </span>
                            </p>
                            <p className="text-[#818BAC] flex items-center">
                              <span className="text-white min-w-[70px] inline-block">Holder:</span> 
                              <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1">
                                {getBankDetails(withdrawal)?.cardHolder || 'N/A'}
                              </span>
                            </p>
                          </>
                        ) : withdrawal.method === 'paypal' ? (
                          <p className="text-[#818BAC] flex items-center">
                            <span className="text-white min-w-[70px] inline-block">PayPal:</span> 
                            <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1 flex items-center gap-2">
                              <BsPaypal className="text-blue-400" />
                              {withdrawal.paypalEmail || 'N/A'}
                            </span>
                          </p>
                        ) : (withdrawal.method as string) === 'crypto' ? (
                          <>
                            <p className="text-[#818BAC] flex items-center">
                              <span className="text-white min-w-[70px] inline-block">Wallet:</span> 
                              <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1 flex items-center gap-2">
                                <FaBitcoin className="text-orange-400" />
                                {withdrawal.cryptoAddress || 'N/A'}
                              </span>
                            </p>
                            <p className="text-[#818BAC] flex items-center">
                              <span className="text-white min-w-[70px] inline-block">Network:</span> 
                              <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1">
                                {withdrawal.cryptoNetwork || 'N/A'}
                              </span>
                            </p>
                          </>
                        ) : (
                          <p className="text-[#818BAC] flex items-center">
                            <span className="text-white min-w-[70px] inline-block">Method:</span> 
                            <span className="bg-[#3f2d63]/30 rounded-md px-2 py-0.5 ml-1 flex-1">
                              {withdrawal.method || 'Unknown'}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {withdrawal.status === 'pending' && (
                    <div className="flex gap-3 md:self-start">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setConfirmModal({
                          isOpen: true,
                          type: 'approve',
                          withdrawalId: getDocumentId(withdrawal),
                          userId: withdrawal.userId,
                          amount: withdrawal.amount,
                          userName: usersData[withdrawal.userId]?.name || getBankDetails(withdrawal)?.holderName || withdrawal.paypalEmail || 'User'
                        })}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-400 p-3 rounded-xl 
                                 hover:from-green-500/30 hover:to-green-600/30 hover:text-green-300
                                 disabled:opacity-50 transition-all shadow-sm border border-green-500/30"
                      >
                        <BsCheck2Circle size={28} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setConfirmModal({
                          isOpen: true,
                          type: 'reject',
                          withdrawalId: getDocumentId(withdrawal),
                          userId: withdrawal.userId,
                          amount: withdrawal.amount,
                          userName: usersData[withdrawal.userId]?.name || getBankDetails(withdrawal)?.holderName || withdrawal.paypalEmail || 'User'
                        })}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 p-3 rounded-xl 
                                 hover:from-red-500/30 hover:to-red-600/30 hover:text-red-300
                                 disabled:opacity-50 transition-all shadow-sm border border-red-500/30"
                      >
                        <BsXCircle size={28} />
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {withdrawals.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-[#272B43] to-[#1e2235] rounded-xl p-8 border border-[#3f2d63] text-center shadow-lg"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-[#20DDBB]/30 to-[#15a88c]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <BsCashStack size={38} className="text-[#20DDBB]" />
              </div>
              <p className="text-white font-bold text-lg">No Withdrawal Requests</p>
              <p className="text-[#818BAC] mt-1">All withdrawal requests have been processed</p>
            </motion.div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => handleProcess(
          confirmModal.withdrawalId,
          confirmModal.userId,
          confirmModal.type === 'approve' ? 'approved' : 'rejected'
        )}
        type={confirmModal.type}
        amount={confirmModal.amount}
        userName={confirmModal.userName}
      />
    </div>
  );
}