"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";
import { Button } from "./ui/button";

interface ReasoningContentProps {
  reasoning: string;
  isComplete?: boolean;
  isCollapsed?: boolean;
}

export function ReasoningContent({ reasoning, isComplete = true, isCollapsed: externalCollapsed }: ReasoningContentProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(externalCollapsed ?? isComplete);
  
  useEffect(() => {
    if (externalCollapsed !== undefined) {
      setInternalCollapsed(externalCollapsed);
    }
  }, [externalCollapsed]);
  
  const isCollapsed = internalCollapsed;

  if (!reasoning || reasoning.length === 0) {
    return null;
  }

  const handleToggle = () => {
    setInternalCollapsed(!internalCollapsed);
  };

  return (
    <div className="mb-3 rounded-lg w-full">
      <Button
        onClick={handleToggle}
        variant="ghost"
        className="flex text-xs text-gray-500 items-center gap-1.5 w-full justify-start bg-zinc-100 dark:bg-neutral-800 font-normal"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
        <Brain className="w-3.5 h-3.5" />
        <span className="inline-block vertical-align-middle">思考过程</span>
        {/* {isComplete && (
          <span className="text-amber-500 ml-1">(已折叠)</span>
        )} */}
      </Button>
      
      {!isCollapsed && (
        <div className="text-gray-500 whitespace-pre-wrap leading-relaxed space-y-1 text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
          {reasoning}
        </div>
      )}
    </div>
  );
}
