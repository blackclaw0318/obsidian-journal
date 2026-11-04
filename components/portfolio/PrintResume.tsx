"use client";
import { Printer } from "lucide-react";
export function PrintResume() { return <button type="button" className="button-ink print-button" onClick={() => window.print()}><Printer size={16} />打印 / 保存 PDF</button>; }
