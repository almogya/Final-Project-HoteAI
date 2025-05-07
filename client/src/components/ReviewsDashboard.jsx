import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const COLORS = ['#00C49F', '#FF8042'];

function ResponseQualityChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('/api/reviews/response-quality-over-time')
      .then(res => setData(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Error fetching response quality:', err));
  }, []);

  return (
    <LineChart width={600} height={300} data={data}>
      <CartesianGrid stroke="#ccc" />
      <XAxis dataKey="review_date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="avg_quality" stroke="#8884d8" />
    </LineChart>
  );
}

function ReviewsDashboard() {
  const [reviews, setReviews] = useState([]);
  const [filters, setFilters] = useState({ hotel_id: '', chain_id: '', from: '', to: '' });

  useEffect(() => { fetchReviews(); }, [filters]);

  const fetchReviews = async () => {
    try {
      const params = {};
      if (filters.hotel_id) params.hotel_id = filters.hotel_id;
      if (filters.chain_id) params.chain_id = filters.chain_id;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const { data } = await axios.get('http://localhost:4000/api/reviews', { params });

      // שומרים רק ביקורות עם ציון גדול מ-0
      const filtered = data.filter(r => r.calculate_score && r.calculate_score > 0);
      setReviews(filtered);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  /* ─────────────── Dashboards helpers ─────────────── */

  const ratingCounts = Array.from({ length: 10 }, (_, i) => {
    const rating = i + 1;
    return { rating: rating.toString(), count: reviews.filter(r => r.rating === rating).length };
  });

  const answered = reviews.length;           // יש ציון ⇒ נענו
  const unanswered = 0;                      // מסננים רק עם ציון, אז אין שלא נענו
  const responseData = [
    { name: 'Answered', value: answered },
    { name: 'Unanswered', value: unanswered }
  ];

  const handleFilterChange = ({ target: { name, value } }) =>
    setFilters(prev => ({ ...prev, [name]: value }));

  /* ───────────────────────── UI ────────────────────── */

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">📊 Reviews Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <input type="number" name="hotel_id" placeholder="Hotel ID" onChange={handleFilterChange} className="p-2 border rounded" />
        <input type="number" name="chain_id" placeholder="Chain ID" onChange={handleFilterChange} className="p-2 border rounded" />
        <input type="date"   name="from"     onChange={handleFilterChange} className="p-2 border rounded" />
        <input type="date"   name="to"       onChange={handleFilterChange} className="p-2 border rounded" />
      </div>

      {/* Rating distribution + response rate */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Rating Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ratingCounts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rating" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">AI Response Rate</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={responseData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {responseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Response quality over time */}
      <section className="bg-white p-6 rounded-lg shadow mb-12">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Response Quality Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ResponseQualityChart />
        </ResponsiveContainer>
      </section>

      {/* All reviews list */}
      <h2 className="text-2xl font-semibold mb-4 text-gray-700">All Reviews</h2>
      <ul className="space-y-6">
        {reviews.map(rev => (
          <li key={rev.review_id} className="bg-white p-4 shadow rounded-lg border">
            <p className="text-gray-800 font-semibold">👤 {rev.review_text}</p>
            <p className="text-gray-600">⭐ Rating: {rev.rating}</p>
            <p className="text-gray-500">🏨 Hotel: {rev.hotel_name} | 🏢 Chain: {rev.hotel_chain}</p>
            <p className="mt-2"><strong>Hotel Response:</strong> {rev.hotel_response}</p>
            <p><strong>Response Quality Score:</strong> {Math.round(rev.calculate_score)}</p>
            <p className="text-sm text-gray-400">🕒 {new Date(rev.created_at).toLocaleDateString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ReviewsDashboard;
