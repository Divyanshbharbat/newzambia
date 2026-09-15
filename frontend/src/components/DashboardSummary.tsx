import { useEffect, useState, useMemo } from "react";
import { useRecoilValue } from "recoil";
import { standardList } from "../store/store";
import {
  fetchDashboardOverview,
  fetchDashboardClassStats,
  fetchDashboardDetailedStats,
  fetchAttendanceSummary,
  fetchSubjects,
  fetchResultStatus,
} from "../apis/api";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  IndianRupee,
  Bus,
  Package,
  UserCheck,
  Languages,
  BookOpen
} from "lucide-react";

const COLORS = ["#00C49F", "#FF8042", "#0088FE", "#FFBB28"];

const DashboardSummary = () => {
  const [overview, setOverview] = useState<any>(null);
  const [classStats, setClassStats] = useState<any[]>([]);
  const [detailedStats, setDetailedStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // standards from global store
  const standards = useRecoilValue(standardList);

  // attendance related
  const [selectedStandard, setSelectedStandard] = useState<string>("");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [attendanceData, setAttendanceData] = useState<any>(null);

  // Result Status related
  const [selectedResultStandard, setSelectedResultStandard] = useState<string>("");
  const [resultStatus, setResultStatus] = useState<any>(null);
  const [loadingResult, setLoadingResult] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [overviewData, classStatsData, detailedData] = await Promise.all([
          fetchDashboardOverview(),
          fetchDashboardClassStats(),
          fetchDashboardDetailedStats(),
        ]);
        setOverview(overviewData);
        setClassStats(classStatsData);
        setDetailedStats(detailedData);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // fetch subjects whenever standard changes
  useEffect(() => {
    const loadSubjects = async () => {
      if (!selectedStandard) {
        setSubjects([]);
        setSelectedSubject("");
        return;
      }
      try {
        const resp: any = await fetchSubjects(selectedStandard);
        const list: any[] = resp.data || [];
        setSubjects(list);
      } catch (err) {
        console.error("Failed to load subjects", err);
      }
    };
    loadSubjects();
  }, [selectedStandard]);

  // fetch attendance whenever filter changes
  useEffect(() => {
    const parseDateString = (dateString: string) => {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const loadAttendance = async () => {
      try {
        let data: any = await fetchAttendanceSummary(
          selectedStandard || undefined,
          period,
          attendanceDate || undefined,
          selectedSubject || undefined
        );
        console.log("raw attendance response", period, data);
        // ensure weekly data is an array
        if (period === 'weekly') {
          if (!Array.isArray(data)) {
            console.warn("weekly attendance should be array, got", data);
            data = [];
          }
        }
        // convert string percentages to numbers and compute a Monday-Saturday window based on selected date
        if (period === 'weekly' && Array.isArray(data)) {
          const sanitized = data.map((item: any) => {
            const percentage = parseFloat(item.percentage) || 0;
            return { ...item, percentage };
          });

          const selected = parseDateString(attendanceDate || new Date().toISOString().split('T')[0]);
          selected.setHours(0, 0, 0, 0);
          const day = selected.getDay(); // 0=Sunday
          let diffToMonday = 1 - day;
          if (day === 0) diffToMonday = -6;
          const monday = new Date(selected);
          monday.setDate(monday.getDate() + diffToMonday);

          const result: any[] = [];
          for (let i = 0; i < 6; i += 1) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const key = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });

            const shifted = new Date(d);
            shifted.setDate(d.getDate() + 1);
            const shiftedDate = shifted.toISOString().split('T')[0];
            const label = `${dayName.slice(0, 3)} ${shiftedDate.slice(-2)}`;
            const existing = sanitized.find((item: any) => item.date === key);

            if (existing) {
              result.push({ ...existing, day: dayName, label });
            } else {
              result.push({ date: key, total: 0, present: 0, absent: 0, percentage: 0, day: dayName, label });
            }
          }

          data = result;
        } else if (period === 'daily' && data && data.percentage) {
          data.percentage = parseFloat(data.percentage) || 0;
        }
        console.log("processed attendanceData", data);
        setAttendanceData(data);
      } catch (err) {
        console.error("Failed to load attendance summary", err);
      }
    };

    loadAttendance();
  }, [selectedStandard, period, attendanceDate, selectedSubject]);

  // fetch result status whenever its standard changes
  useEffect(() => {
    const loadResultStatus = async () => {
      if (!selectedResultStandard) {
        setResultStatus(null);
        return;
      }
      setLoadingResult(true);
      try {
        const data = await fetchResultStatus(selectedResultStandard);
        setResultStatus(data);
      } catch (err) {
        console.error("Failed to load result status", err);
      } finally {
        setLoadingResult(false);
      }
    };
    loadResultStatus();
  }, [selectedResultStandard]);

  // compute data that depend on loaded values but not conditional

  // number of students in selected class (or total if none selected)
  const totalStudentsCount = useMemo(() => {
    if (selectedStandard) {
      const cls = classStats.find((c: any) => c.className === selectedStandard);
      return cls?.studentCount || 0;
    }
    return classStats.reduce((sum: number, c: any) => sum + c.studentCount, 0);
  }, [classStats, selectedStandard]);

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard data...</div>;
  }



  return (
    <div className="pl-4 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Admin Overview</h2>

      {/* Top Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={<Users size={24} className="text-blue-600" />}
          title="Total Students"
          value={overview?.totalStudents || 0}
          bgColor="bg-blue-100"
        />
        <StatCard
          icon={<IndianRupee size={24} className="text-emerald-600" />}
          title="Fees Collected"
          value={`₹ ${overview?.totalFeesCollected?.toLocaleString() || 0}`}
          bgColor="bg-emerald-100"
        />
        <StatCard
          icon={<IndianRupee size={24} className="text-red-600" />}
          title="Pending Fees"
          value={`₹ ${overview?.pendingFees?.toLocaleString() || 0}`}
          bgColor="bg-red-100"
        />

        <StatCard
          icon={<Bus size={24} className="text-orange-600" />}
          title="Bus Stations"
          value={overview?.totalBusStations || 0}
          bgColor="bg-orange-100"
        />
        <StatCard
          icon={<Package size={24} className="text-indigo-600" />}
          title="Inventory Items"
          value={overview?.totalInventoryItems || 0}
          bgColor="bg-indigo-100"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Result Status (Final Semester) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-lg font-semibold text-gray-700">
              Result Status (Final Semester)
            </h3>
            <select
              value={selectedResultStandard}
              onChange={(e) => setSelectedResultStandard(e.target.value)}
              className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select Class</option>
              {standards.map((std) => (
                <option key={std} value={std}>
                  {std}
                </option>
              ))}
            </select>
          </div>

          {loadingResult ? (
            <div className="text-center py-10">Loading results...</div>
          ) : resultStatus ? (
            <div className="space-y-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Passed", value: resultStatus.passedStudents },
                        { name: "Failed", value: resultStatus.failedStudents },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[resultStatus.passedStudents, resultStatus.failedStudents].map((_, index) => (
                        <Cell key={`cell-res-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">Passed:</span>
                  <span className="font-bold text-green-600">{resultStatus.passPercentage}%</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">Failed:</span>
                  <span className="font-bold text-red-600">{resultStatus.failPercentage}%</span>
                </div>
              </div>
              <div className="text-center text-xs font-medium text-gray-500">
                Total Students: {resultStatus.totalStudents}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm">
              Select a class to view result stats.
            </div>
          )}
        </div>

        {/* Students Per Class */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            Students Per Class
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={classStats}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="className" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="studentCount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Detailed Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {detailedStats?.gender && (
          <DemographicCard
            title="Gender Distribution"
            data={detailedStats.gender}
            icon={<UserCheck size={20} className="text-pink-600" />}
          />
        )}
        {detailedStats?.categories && (
          <DemographicCard
            title="Category Distribution"
            data={detailedStats.categories}
            icon={<BookOpen size={20} className="text-purple-600" />}
          />
        )}
        {detailedStats?.religions && (
          <DemographicCard
            title="Religion Distribution"
            data={detailedStats.religions}
            icon={<Users size={20} className="text-cyan-600" />}
          />
        )}
        {detailedStats?.languages && (
          <DemographicCard
            title="Language Distribution"
            data={detailedStats.languages}
            icon={<Languages size={20} className="text-indigo-600" />}
          />
        )}
      </div>

      {/* Attendance Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 space-y-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
          Attendance Summary
        </h3>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="flex flex-col">
            <label className="text-sm text-gray-500 mb-1">Class</label>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">All</option>
              {standards.map((std) => (
                <option key={std} value={std}>
                  {std}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-500 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">All</option>
              {subjects.map((sub) => (
                <option key={sub.id || sub.name} value={sub.id || sub.name}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-500 mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "daily" | "weekly")}
              className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-200"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Charts */}
        {/* summary text for counts */}
        {attendanceData && (
          <div className="mb-4 text-gray-700 bg-gray-50 p-4 rounded-lg">
            <p className="font-medium">Total Students: <strong>{totalStudentsCount}</strong></p>
            {period === 'daily' ? (
              <>
                <p>Attendance Taken: <strong>{attendanceData.total}</strong></p>
                <p>Present: <strong className="text-green-600">{attendanceData.present}</strong></p>
                <p>Absent: <strong className="text-red-600">{attendanceData.absent}</strong></p>
                <p>Present %: <strong className="text-green-600">{attendanceData.percentage}%</strong></p>
                <p>Absent %: <strong className="text-red-600">{(100 - attendanceData.percentage).toFixed(2)}%</strong></p>
              </>
            ) : Array.isArray(attendanceData) && (
              (() => {
                const totals = attendanceData.reduce(
                  (acc: any, cur: any) => {
                    acc.total += cur.total;
                    acc.present += cur.present;
                    acc.absent += cur.absent;
                    return acc;
                  },
                  { total: 0, present: 0, absent: 0 }
                );
                const perc = totals.total > 0 ? ((totals.present / totals.total) * 100).toFixed(2) : '0';
                return (
                  <>
                    <p>Entries (sum over days): <strong>{totals.total}</strong></p>
                    <p>Present (sum): <strong className="text-green-600">{totals.present}</strong></p>
                    <p>Absent (sum): <strong className="text-red-600">{totals.absent}</strong></p>
                    <p>Present % (overall): <strong className="text-green-600">{perc}%</strong></p>
                    <p>Absent %: <strong className="text-red-600">{(100 - parseFloat(perc)).toFixed(2)}%</strong></p>
                  </>
                );
              })()
            )}
          </div>
        )}

        {period === "daily" && attendanceData && (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Present", value: attendanceData.present },
                    { name: "Absent", value: attendanceData.absent },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent = 0 }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[attendanceData.present, attendanceData.absent].map((_, index) => (
                    <Cell key={`cell-att-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {period === "weekly" && Array.isArray(attendanceData) && (
          <div className="h-72">
     
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={attendanceData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="percentage"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* display message only when data loaded but empty */}
        <div className="mt-4 text-center text-sm text-gray-500">
        {attendanceData &&
          ((period === "daily" && attendanceData.total === 0) ||
            (period === "weekly" && Array.isArray(attendanceData) && attendanceData.every((e: any) => e.total === 0))) && (
            <p className="text-sm text-gray-500 mt-4">
              No attendance records available.
            </p>
        )}
      </div>
    </div>

      {/* Removed old Result Status block - moved to top */}
  </div>
  );
};

const StatCard = ({ icon, title, value, bgColor }: any) => {
  return (
    <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow duration-300 group">
      <div className="flex items-center">
        <div className={`p-2.5 rounded-lg ${bgColor} mr-3 transition-transform group-hover:scale-110 duration-300`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate mb-1" title={title}>{title}</p>
          <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
        </div>
      </div>
    </div>
  );
};

const DemographicCard = ({ title, data, icon }: any) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4 border-b pb-2">
        {icon}
        <h4 className="font-semibold text-gray-700">{title}</h4>
      </div>
      <div className="space-y-3">
        {data.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between items-center">
            <span className="text-sm text-gray-600 truncate mr-2" title={item.type}>{item.type}</span>
            <span className="text-sm font-bold bg-gray-100 px-2 py-0.5 rounded-full">{item.count}</span>
          </div>
        ))}
        {data.length === 0 && <p className="text-xs text-center text-gray-400">No data available</p>}
      </div>
    </div>
  );
};

export default DashboardSummary;
