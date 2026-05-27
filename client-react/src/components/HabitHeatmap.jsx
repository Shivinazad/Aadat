import { useState, useEffect, useRef } from 'react';
import { heatmapAPI } from '../services/api';
import '../styles/HabitHeatmap.css';

const INTENSITY_COLORS = [
  '#161b22', // 0 — empty
  '#0e4429', // 1
  '#006d32', // 2-3
  '#26a641', // 4-5
  '#39d353', // 6+
];

const getIntensity = (count) => {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HabitHeatmap = ({ userId }) => {
  const [heatmapData, setHeatmapData] = useState({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await heatmapAPI.getData(userId);
      const dataMap = {};
      (res.data || []).forEach(item => {
        dataMap[item.date] = item.count;
      });
      setHeatmapData(dataMap);
    } catch (error) {
      console.error('Failed to fetch heatmap data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate grid: 53 columns × 7 rows, ending at today
  const generateGrid = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the start: go back ~52 weeks + to the previous Sunday
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    // Align to Sunday
    start.setDate(start.getDate() - start.getDay());

    const weeks = [];
    let currentDate = new Date(start);

    while (currentDate <= today) {
      const week = [];
      for (let day = 0; day < 7; day++) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + day);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dateVal = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${dateVal}`;

        const count = heatmapData[dateStr] || 0;
        const isFuture = d > today;

        week.push({
          date: dateStr,
          count: isFuture ? -1 : count,
          dayOfWeek: d.getDay(),
          displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        });
      }
      weeks.push(week);
      currentDate.setDate(currentDate.getDate() + 7);
    }

    // Group weeks by month based on the Sunday of each week
    const monthsGroup = [];
    let currentMonth = null;

    weeks.forEach((week, globalWeekIndex) => {
      week.globalWeekIndex = globalWeekIndex;

      const sundayDate = new Date(week[0].date);
      const monthName = MONTHS[sundayDate.getMonth()];

      if (!currentMonth || currentMonth.label !== monthName) {
        currentMonth = {
          label: monthName,
          weeks: []
        };
        monthsGroup.push(currentMonth);
      }
      currentMonth.weeks.push(week);
    });

    // Clear label for the first month if it has less than 3 weeks to prevent visual overflow
    if (monthsGroup.length > 0 && monthsGroup[0].weeks.length < 3) {
      monthsGroup[0].label = '';
    }

    return { monthsGroup };
  };

  const { monthsGroup } = generateGrid();

  const totalCompletions = Object.values(heatmapData).reduce((sum, c) => sum + c, 0);
  const activeDays = Object.values(heatmapData).filter(c => c > 0).length;

  const handleCellHover = (e, cell) => {
    if (cell.count < 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    setTooltip({
      text: `${cell.displayDate} — ${cell.count} completion${cell.count !== 1 ? 's' : ''}`,
      x: rect.left - (containerRect?.left || 0) + rect.width / 2,
      y: rect.top - (containerRect?.top || 0) - 8
    });
  };

  if (loading) {
    return (
      <section className="heatmap-section">
        <div className="heatmap-card">
          <h2 className="heatmap-title">📅 Activity Heatmap</h2>
          <div className="heatmap-loading">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="heatmap-section">
      <div className="heatmap-card">
        <div className="heatmap-header">
          <h2 className="heatmap-title">📅 Activity Heatmap</h2>
          <div className="heatmap-summary">
            <span className="heatmap-stat-pill">
              <strong>{totalCompletions}</strong> completions
            </span>
            <span className="heatmap-stat-pill">
              <strong>{activeDays}</strong> active days
            </span>
          </div>
        </div>

        <div className="heatmap-scroll-wrapper" ref={containerRef}>
          <div className="heatmap-grid-container">
            <div className="heatmap-body">
              {/* Day labels */}
              <div className="heatmap-day-labels">
                <div className="heatmap-month-header-spacer"></div>
                {DAYS.map((d, i) => (
                  <div key={i} className={`heatmap-day-label ${i % 2 === 0 ? '' : 'visible'}`}>
                    {i % 2 !== 0 ? d : ''}
                  </div>
                ))}
              </div>

              {/* Grid grouped by months */}
              <div className="heatmap-months-container">
                {monthsGroup.map((m, mi) => (
                  <div key={mi} className="heatmap-month-group">
                    <div className="heatmap-month-header">{m.label}</div>
                    <div className="heatmap-month-weeks">
                      {m.weeks.map((week) => (
                        <div key={week.globalWeekIndex} className="heatmap-week">
                          {week.map((cell, di) => (
                            <div
                              key={`${week.globalWeekIndex}-${di}`}
                              className={`heatmap-cell ${cell.count < 0 ? 'future' : ''}`}
                              style={{
                                backgroundColor: cell.count < 0
                                  ? 'transparent'
                                  : INTENSITY_COLORS[getIntensity(cell.count)],
                                animationDelay: `${(week.globalWeekIndex * 7 + di) * 2}ms`
                              }}
                              onMouseEnter={(e) => handleCellHover(e, cell)}
                              onMouseLeave={() => setTooltip(null)}
                              data-count={cell.count}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="heatmap-tooltip"
              style={{
                left: tooltip.x,
                top: tooltip.y
              }}
            >
              {tooltip.text}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="heatmap-legend">
          <span className="heatmap-legend-label">Less</span>
          {INTENSITY_COLORS.map((color, i) => (
            <div
              key={i}
              className="heatmap-legend-cell"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="heatmap-legend-label">More</span>
        </div>
      </div>
    </section>
  );
};

export default HabitHeatmap;
