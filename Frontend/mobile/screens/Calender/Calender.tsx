// screens/Calender/Calender.tsx
import React from "react";
import CalendarView, { ClassEvent } from "../../components/CalenderView";

interface CalendarScreenProps {
  data: ClassEvent[];
}

export default function Calendar({ data }: CalendarScreenProps) {
  return <CalendarView data={data} />;
}
