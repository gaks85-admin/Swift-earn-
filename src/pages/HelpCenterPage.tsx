import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  MessageSquare,
  CheckCircle2,
  Mail,
  ChevronDown,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const HelpCenterPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Ticket form state
  const [name, setName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('Reward Verification Issue');
  const [message, setMessage] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  const faqItems = [
    {
      category: 'rewards',
      q: 'Why did my reward not credit immediately?',
      a: 'In accordance with advertising partner guidelines, rewards require cryptographic confirmation from the ad provider. Ensure you did not close the window before the designated countdown concluded. If an internet timeout occurred, you can restart the opportunity from the Earn page.',
    },
    {
      category: 'withdrawals',
      q: 'What is the minimum withdrawal amount?',
      a: 'The minimum withdrawal is ₦500.00. You can request a payout anytime your confirmed available balance meets or exceeds this threshold.',
    },
    {
      category: 'withdrawals',
      q: 'How long do bank transfers take?',
      a: 'Standard bank transfers and fintech wallet payouts (Opay, Palmpay, Moniepoint) typically process within 15 minutes to 2 business hours following security validation.',
    },
    {
      category: 'account',
      q: 'Can I change my registered email or bank details?',
      a: 'For security and anti-fraud purposes, bank account details can be updated directly when requesting a withdrawal. To update your account email, please submit a ticket below.',
    },
    {
      category: 'referrals',
      q: 'When do I receive my ₦50.00 referral bonus?',
      a: 'Your referral bonus is credited automatically as soon as your invited friend signs up using your code and completes their very first verified reward opportunity.',
    },
    {
      category: 'security',
      q: 'Does Swift Earn permit VPNs or proxies?',
      a: 'No. Advertising partners strictly prohibit VPNs, proxies, automated scripts, and virtual machines. Using proxies may trigger an anti-fraud lock on your account balance.',
    },
  ];

  const filteredFaqs = faqItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const ticketId = `SE-TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    setSubmittedTicket(ticketId);
    setMessage('');
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-24 md:pb-12 pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#6C2BD9]">
            Customer Care
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Help Center & FAQ
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Browse answers to common questions or connect with our support desk.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords (e.g. withdrawal, points, bank transfer)..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-zinc-200 text-sm focus:outline-hidden focus:border-[#6C2BD9] shadow-xs"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['all', 'rewards', 'withdrawals', 'referrals', 'account', 'security'].map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                selectedCategory === c
                  ? 'bg-[#6C2BD9] text-white'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 font-bold text-zinc-900 hover:text-[#6C2BD9]"
                >
                  <span className="text-sm">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-[#6C2BD9]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 text-xs text-zinc-600 leading-relaxed border-t border-zinc-100 bg-purple-50/20">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact Support Ticket Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6C2BD9] text-[#B8F500] flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-zinc-900">Open a Support Ticket</h3>
              <p className="text-xs text-zinc-500">Need specific assistance with a transaction or session?</p>
            </div>
          </div>

          {submittedTicket ? (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center space-y-2 animate-in fade-in">
              <CheckCircle2 className="w-8 h-8 text-[#6C2BD9] mx-auto" />
              <h4 className="text-sm font-bold text-zinc-900">Support Ticket Created</h4>
              <p className="text-xs text-zinc-600">
                Ticket Reference: <strong className="font-mono text-[#6C2BD9]">{submittedTicket}</strong>
              </p>
              <p className="text-xs text-zinc-500">
                Our support team has logged your inquiry. You will receive an update in your notifications.
              </p>
              <button
                onClick={() => setSubmittedTicket(null)}
                className="mt-3 text-xs font-bold text-[#6C2BD9] hover:underline"
              >
                Submit another inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:outline-hidden focus:border-[#6C2BD9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:outline-hidden focus:border-[#6C2BD9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Inquiry Category</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:outline-hidden focus:border-[#6C2BD9]"
                >
                  <option value="Reward Verification Issue">Reward Verification Issue</option>
                  <option value="Withdrawal Processing Question">Withdrawal Processing Question</option>
                  <option value="Referral Credit Inquiry">Referral Credit Inquiry</option>
                  <option value="Account Security">Account Security & Verification</option>
                  <option value="Other">Other Question</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Message Description</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe your question or provide transaction details..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:outline-hidden focus:border-[#6C2BD9]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Send Support Ticket</span>
                <Send className="w-3.5 h-3.5 text-[#B8F500]" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
