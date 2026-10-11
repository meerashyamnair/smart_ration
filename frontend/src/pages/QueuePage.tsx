import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Calendar, Clock, Ticket, CheckCircle, XCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const QueuePage: React.FC = () => {
  const [bookingDate, setBookingDate] = useState('2026-10-15');
  const [slotsInfo, setSlotsInfo] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSlots();
    fetchMyBookings();
  }, [bookingDate]);

  const fetchSlots = async () => {
    try {
      const res = await api.get(`/queue/slots?date=${bookingDate}`);
      if (res.data.success) {
        setSlotsInfo(res.data.data.slots);
      }
    } catch (err) {
      console.error('Failed to load queue slots', err);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const res = await api.get('/queue/my-bookings');
      if (res.data.success) setBookings(res.data.data);
    } catch (err) {
      console.error('Failed to load my bookings', err);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await api.post('/queue/book', { bookingDate, timeSlot: selectedSlot });
      if (res.data.success) {
        setMessage(`Queue slot booked! Token Number: #${res.data.data.tokenNumber}`);
        setSelectedSlot('');
        fetchSlots();
        fetchMyBookings();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      const res = await api.patch(`/queue/cancel/${bookingId}`);
      if (res.data.success) {
        fetchSlots();
        fetchMyBookings();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Cancellation failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Queue Slot Reservation</h2>
        <p className="text-xs text-slate-400">Reserve collection times at your Fair Price Shop to avoid long lines</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Form & Available Slots */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" /> Book a Ration Collection Slot
          </h3>

          <form onSubmit={handleBook} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Collection Date
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full py-2.5 px-3.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Time Slots & Remaining Capacity (Max 15/slot)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {slotsInfo.map((slot) => (
                  <button
                    type="button"
                    key={slot.timeSlot}
                    disabled={slot.isFull}
                    onClick={() => setSelectedSlot(slot.timeSlot)}
                    className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      slot.isFull
                        ? 'bg-slate-950/40 text-slate-600 border-slate-800 opacity-60 cursor-not-allowed'
                        : selectedSlot === slot.timeSlot
                        ? 'bg-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-900/40'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{slot.timeSlot}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${slot.isFull ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-emerald-400'}`}>
                      {slot.isFull ? 'FULL' : `${slot.remainingCapacity} Left`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {error && <Alert type="error">{error}</Alert>}
            {message && <Alert type="success">{message}</Alert>}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={loading}
              disabled={!selectedSlot}
            >
              Confirm Queue Token Reservation
            </Button>
          </form>
        </div>

        {/* Existing Active Tokens */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <Ticket className="w-5 h-5 text-amber-400" /> My Active Tokens & History
          </h3>

          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Ticket className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p>No active queue reservations found.</p>
              </div>
            ) : (
              bookings.map((bk) => (
                <div key={bk.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">{bk.bookingDate}</span>
                      <span className="text-xs text-slate-300">({bk.timeSlot})</span>
                      <Badge
                        variant={
                          bk.status === 'BOOKED'
                            ? 'emerald'
                            : bk.status === 'COMPLETED'
                            ? 'blue'
                            : bk.status === 'CANCELLED'
                            ? 'rose'
                            : 'slate'
                        }
                        size="sm"
                      >
                        {bk.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">{bk.fpsShop?.shopName}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Token</span>
                      <span className="text-xl font-black text-amber-400 font-mono">#{bk.tokenNumber}</span>
                    </div>

                    {bk.status === 'BOOKED' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleCancel(bk.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
