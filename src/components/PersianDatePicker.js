import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import moment from 'moment-jalaali';
import './PersianDatePicker.css';

// Extend moment with jalaali
moment.loadPersian({ dialect: 'persian-modern' });

const PersianDatePicker = ({ value, onChange, placeholder = "انتخاب تاریخ" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : new Date());
  const [currentView, setCurrentView] = useState('calendar'); // 'calendar' or 'time'
  const [selectedTime, setSelectedTime] = useState({ 
    hours: value ? new Date(value).getHours() : new Date().getHours(), 
    minutes: value ? new Date(value).getMinutes() : new Date().getMinutes() 
  });
  
  const pickerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Persian month names
  const persianMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  // Persian day names (Saturday to Friday)
  const persianDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  // Convert Gregorian to Persian date using moment-jalaali
  const gregorianToPersian = (date) => {
    const jMoment = moment(date);
    return {
      year: jMoment.jYear(),
      month: jMoment.jMonth() + 1, // moment-jalaali uses 0-based months
      day: jMoment.jDate()
    };
  };

  // Convert Persian to Gregorian date using moment-jalaali
  const persianToGregorian = (persianDate) => {
    const jMoment = moment(`${persianDate.year}/${persianDate.month}/${persianDate.day}`, 'jYYYY/jM/jD');
    return jMoment.toDate();
  };

  // Get calendar days for current month
  const getCalendarDays = () => {
    const persianDate = gregorianToPersian(currentDate);
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= lastDayOfMonth || days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Get Persian calendar days for current month
  const getPersianCalendarDays = () => {
    const persianCurrentDate = gregorianToPersian(currentDate);
    
    // Create moment-jalaali for the first day of current month
    const jMoment = moment(`${persianCurrentDate.year}/${persianCurrentDate.month}/1`, 'jYYYY/jM/jD');
    
    // Get the first day of the Persian month in Gregorian
    const firstDayOfPersianMonth = jMoment.toDate();
    
    // Get the last day of the Persian month by trying different day numbers
    let lastDayOfPersianMonth;
    for (let day = 31; day >= 1; day--) {
      try {
        const testMoment = moment(`${persianCurrentDate.year}/${persianCurrentDate.month}/${day}`, 'jYYYY/jM/jD');
        if (testMoment.isValid()) {
          lastDayOfPersianMonth = testMoment.toDate();
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Calculate the start of the calendar grid based on Persian week start (Saturday)
    const startDate = new Date(firstDayOfPersianMonth);
    const dayOfWeek = firstDayOfPersianMonth.getDay();
    // Persian week starts on Saturday (6), so adjust accordingly
    // Saturday=6, Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5
    // We want Saturday to be 0, so: (dayOfWeek + 1) % 7
    const daysToSubtract = (dayOfWeek + 1) % 7;
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= lastDayOfPersianMonth || days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setCurrentView('time');
  };

  // Handle time selection
  const handleTimeSelect = () => {
    if (selectedDate) {
      const finalDate = new Date(selectedDate);
      finalDate.setHours(selectedTime.hours, selectedTime.minutes);
      
      onChange(finalDate);
      setIsOpen(false);
      setCurrentView('calendar');
    }
  };

  // Handle month navigation
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  // Handle year navigation
  const navigateYear = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(newDate.getFullYear() + direction);
    setCurrentDate(newDate);
  };

  // Close picker when clicking outside and update position on scroll
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside both the picker input and the dropdown
      const isOutsidePicker = pickerRef.current && !pickerRef.current.contains(event.target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);
      
      if (isOutsidePicker && isOutsideDropdown) {
        setIsOpen(false);
        setCurrentView('calendar');
      }
    };

    const handleScroll = () => {
      if (isOpen && pickerRef.current && dropdownRef.current) {
        const rect = pickerRef.current.getBoundingClientRect();
        dropdownRef.current.style.top = `${rect.bottom + 4}px`;
        dropdownRef.current.style.left = `${rect.left}px`;
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  // Format selected date for display
  const formatSelectedDate = () => {
    if (!selectedDate) return '';
    
    const persianDate = gregorianToPersian(selectedDate);
    return `${persianDate.year}/${persianDate.month.toString().padStart(2, '0')}/${persianDate.day.toString().padStart(2, '0')} ${selectedTime.hours.toString().padStart(2, '0')}:${selectedTime.minutes.toString().padStart(2, '0')}`;
  };

  const calendarDays = getPersianCalendarDays();
  const persianCurrentDate = gregorianToPersian(currentDate);

  return (
    <div className="persian-date-picker" ref={pickerRef}>
      <div 
        className="date-picker-input"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="date-picker-icon">📅</span>
        <span className="date-picker-text">
          {formatSelectedDate() || placeholder}
        </span>
        <span className="date-picker-arrow">▼</span>
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="date-picker-dropdown"
          style={{
            position: 'fixed',
            top: pickerRef.current ? pickerRef.current.getBoundingClientRect().bottom + 4 : 0,
            left: pickerRef.current ? pickerRef.current.getBoundingClientRect().left : 0,
            zIndex: 10000,
          }}
          onMouseEnter={() => {
            // Ensure position is correct when hovering
            if (pickerRef.current && dropdownRef.current) {
              const rect = pickerRef.current.getBoundingClientRect();
              dropdownRef.current.style.top = `${rect.bottom + 4}px`;
              dropdownRef.current.style.left = `${rect.left}px`;
            }
          }}
        >
          {currentView === 'calendar' ? (
            <div className="calendar-view">
              {/* Header */}
              <div className="calendar-header">
                <button 
                  className="nav-button"
                  onClick={() => navigateYear(-1)}
                >
                  ‹‹
                </button>
                <button 
                  className="nav-button"
                  onClick={() => navigateMonth(-1)}
                >
                  ‹
                </button>
                <div className="current-month">
                  {persianMonths[persianCurrentDate.month - 1]} {persianCurrentDate.year}
                </div>
                <button 
                  className="nav-button"
                  onClick={() => navigateMonth(1)}
                >
                  ›
                </button>
                <button 
                  className="nav-button"
                  onClick={() => navigateYear(1)}
                >
                  ››
                </button>
              </div>

              {/* Day headers */}
              <div className="calendar-days-header">
                {persianDays.map((day, index) => (
                  <div key={index} className="day-header">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="calendar-grid">
                {calendarDays.map((date, index) => {
                  const persianDate = gregorianToPersian(date);
                  const persianSelectedDate = selectedDate ? gregorianToPersian(selectedDate) : null;
                  const persianCurrentDate = gregorianToPersian(currentDate);
                  
                  const isCurrentMonth = persianDate.month === persianCurrentDate.month && persianDate.year === persianCurrentDate.year;
                  const isSelected = persianSelectedDate && 
                    persianDate.day === persianSelectedDate.day &&
                    persianDate.month === persianSelectedDate.month &&
                    persianDate.year === persianSelectedDate.year;
                  
                  const isToday = date.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={index}
                      className={`calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                      onClick={() => isCurrentMonth && handleDateSelect(date)}
                    >
                      {persianDate.day}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="time-view">
              <div className="time-header">
                <button 
                  className="back-button"
                  onClick={() => setCurrentView('calendar')}
                >
                  ‹ بازگشت
                </button>
                <span>انتخاب زمان</span>
              </div>
              
              <div className="time-inputs">
                <div className="time-input-group">
                  <label>ساعت:</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={selectedTime.hours}
                    onChange={(e) => setSelectedTime(prev => ({ ...prev, hours: parseInt(e.target.value) || 0 }))}
                    className="time-input"
                  />
                </div>
                <div className="time-input-group">
                  <label>دقیقه:</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={selectedTime.minutes}
                    onChange={(e) => setSelectedTime(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                    className="time-input"
                  />
                </div>
              </div>
              
              <button 
                className="confirm-button"
                onClick={handleTimeSelect}
              >
                تأیید
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default PersianDatePicker; 