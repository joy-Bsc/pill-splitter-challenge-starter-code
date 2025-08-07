import React, { useState, useRef, useCallback } from 'react';

interface Pill {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  zIndex: number;
  borderRadius: {
    topLeft: number;
    topRight: number;
    bottomLeft: number;
    bottomRight: number;
  };
}

interface MousePosition {
  x: number;
  y: number;
}

function App() {
  const [pills, setPills] = useState<Pill[]>([]);
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<MousePosition>({ x: 0, y: 0 });
  const [draggedPillId, setDraggedPillId] = useState<string | null>(null);
  const [newPill, setNewPill] = useState<Partial<Pill> | null>(null);
  const [hasDraggedSinceMouseDown, setHasDraggedSinceMouseDown] = useState(false);
  const [highestZIndex, setHighestZIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate random color for pills
  const generateRandomColor = useCallback(() => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D2B4DE'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  // Handle mouse movement
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });

    // Handle dragging existing pills
    if (draggedPillId && !isDrawing) {
      setHasDraggedSinceMouseDown(true);
      
      const dx = x - dragStartPos.x;
      const dy = y - dragStartPos.y;
      
      setPills(prevPills => 
        prevPills.map(pill => 
          pill.id === draggedPillId 
            ? { ...pill, x: pill.x + dx, y: pill.y + dy }
            : pill
        )
      );
      
      setDragStartPos({ x, y });
    }
    // Handle creating new pills
    else if (isDrawing && !draggedPillId) {
      setHasDraggedSinceMouseDown(true);
      
      // Create the pill only when we start dragging
      if (!newPill) {
        const newZIndex = highestZIndex + 1;
        setNewPill({
          id: Date.now().toString(),
          x: dragStartPos.x,
          y: dragStartPos.y,
          width: 40,
          height: 40,
          color: generateRandomColor(),
          zIndex: newZIndex,
          borderRadius: {
            topLeft: 20,
            topRight: 20,
            bottomLeft: 20,
            bottomRight: 20
          }
        });
        setHighestZIndex(newZIndex);
      } else {
        // Update the pill size as we drag
        const width = Math.max(40, Math.abs(x - dragStartPos.x));
        const height = Math.max(40, Math.abs(y - dragStartPos.y));
        const startX = Math.min(x, dragStartPos.x);
        const startY = Math.min(y, dragStartPos.y);
        
        setNewPill({
          ...newPill,
          x: startX,
          y: startY,
          width,
          height
        });
      }
    }
  }, [isDrawing, draggedPillId, newPill, dragStartPos, generateRandomColor, highestZIndex]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHasDraggedSinceMouseDown(false);

    // Check if clicking on an existing pill
    const clickedPill = pills.find(pill => 
      x >= pill.x && x <= pill.x + pill.width &&
      y >= pill.y && y <= pill.y + pill.height
    );

    if (clickedPill) {
      // Bring pill to front and prepare for potential dragging
      const newZIndex = highestZIndex + 1;
      setPills(prevPills => 
        prevPills.map(pill => 
          pill.id === clickedPill.id 
            ? { ...pill, zIndex: newZIndex }
            : pill
        )
      );
      setHighestZIndex(newZIndex);
      setDraggedPillId(clickedPill.id);
      setDragStartPos({ x, y });
    } else {
      // Prepare for potential pill creation, but don't create the pill yet
      setIsDrawing(true);
      setDragStartPos({ x, y }); // Store the starting position
    }
  }, [pills, highestZIndex]);

  // Split pill function
  const splitPill = useCallback((pill: Pill, splitX: number, splitY: number): Pill[] => {
    const verticalIntersects = splitX >= pill.x && splitX <= pill.x + pill.width;
    const horizontalIntersects = splitY >= pill.y && splitY <= pill.y + pill.height;

    if (!verticalIntersects && !horizontalIntersects) {
      return [pill]; // No intersection, return original pill
    }

    const parts: Pill[] = [];
    const minSize = 20;

    // Check if the pill is already at minimum size
    if (pill.width <= minSize || pill.height <= minSize) {
      // Don't split, just move the pill to one side
      if (verticalIntersects && horizontalIntersects) {
        // Move to the closest edge
        const leftDistance = splitX - pill.x;
        const rightDistance = (pill.x + pill.width) - splitX;
        const topDistance = splitY - pill.y;
        const bottomDistance = (pill.y + pill.height) - splitY;
        
        const minDistance = Math.min(leftDistance, rightDistance, topDistance, bottomDistance);
        
        if (minDistance === leftDistance) {
          // Move left
          return [{
            ...pill,
            x: splitX - pill.width - 1
          }];
        } else if (minDistance === rightDistance) {
          // Move right
          return [{
            ...pill,
            x: splitX + 1
          }];
        } else if (minDistance === topDistance) {
          // Move up
          return [{
            ...pill,
            y: splitY - pill.height - 1
          }];
        } else {
          // Move down
          return [{
            ...pill,
            y: splitY + 1
          }];
        }
      } else if (verticalIntersects) {
        // Move horizontally
        const leftDistance = splitX - pill.x;
        const rightDistance = (pill.x + pill.width) - splitX;
        
        if (leftDistance < rightDistance) {
          // Move left
          return [{
            ...pill,
            x: splitX - pill.width - 1
          }];
        } else {
          // Move right
          return [{
            ...pill,
            x: splitX + 1
          }];
        }
      } else if (horizontalIntersects) {
        // Move vertically
        const topDistance = splitY - pill.y;
        const bottomDistance = (pill.y + pill.height) - splitY;
        
        if (topDistance < bottomDistance) {
          // Move up
          return [{
            ...pill,
            y: splitY - pill.height - 1
          }];
        } else {
          // Move down
          return [{
            ...pill,
            y: splitY + 1
          }];
        }
      }
    }

    if (verticalIntersects && horizontalIntersects) {
      // Split both ways (4 parts)
      const leftWidth = splitX - pill.x;
      const rightWidth = pill.width - leftWidth;
      const topHeight = splitY - pill.y;
      const bottomHeight = pill.height - topHeight;

      // Top-left
      if (leftWidth >= minSize && topHeight >= minSize) {
        parts.push({
          id: `${pill.id}-tl-${Date.now()}`,
          x: pill.x,
          y: pill.y,
          width: leftWidth,
          height: topHeight,
          color: pill.color,
          zIndex: pill.zIndex,
          borderRadius: {
            topLeft: pill.borderRadius.topLeft, // Keep original
            topRight: 0, // Split edge
            bottomLeft: 0, // Split edge
            bottomRight: 0 // Split edge
          }
        });
      }

      // Top-right
      if (rightWidth >= minSize && topHeight >= minSize) {
        parts.push({
          id: `${pill.id}-tr-${Date.now()}`,
          x: splitX,
          y: pill.y,
          width: rightWidth,
          height: topHeight,
          color: pill.color,
          zIndex: pill.zIndex,
          borderRadius: {
            topLeft: 0, // Split edge
            topRight: pill.borderRadius.topRight, // Keep original
            bottomLeft: 0, // Split edge
            bottomRight: 0 // Split edge
          }
        });
      }

      // Bottom-left
      if (leftWidth >= minSize && bottomHeight >= minSize) {
        parts.push({
          id: `${pill.id}-bl-${Date.now()}`,
          x: pill.x,
          y: splitY,
          width: leftWidth,
          height: bottomHeight,
          color: pill.color,
          zIndex: pill.zIndex,
          borderRadius: {
            topLeft: 0, // Split edge
            topRight: 0, // Split edge
            bottomLeft: pill.borderRadius.bottomLeft, // Keep original
            bottomRight: 0 // Split edge
          }
        });
      }

      // Bottom-right
      if (rightWidth >= minSize && bottomHeight >= minSize) {
        parts.push({
          id: `${pill.id}-br-${Date.now()}`,
          x: splitX,
          y: splitY,
          width: rightWidth,
          height: bottomHeight,
          color: pill.color,
          zIndex: pill.zIndex,
          borderRadius: {
            topLeft: 0, // Split edge
            topRight: 0, // Split edge
            bottomLeft: 0, // Split edge
            bottomRight: pill.borderRadius.bottomRight // Keep original
          }
        });
      }

      // If no parts can be created (all would be too small), move the pill
      if (parts.length === 0) {
        const leftDistance = splitX - pill.x;
        const rightDistance = (pill.x + pill.width) - splitX;
        const topDistance = splitY - pill.y;
        const bottomDistance = (pill.y + pill.height) - splitY;
        
        const minDistance = Math.min(leftDistance, rightDistance, topDistance, bottomDistance);
        
        if (minDistance === leftDistance) {
          return [{...pill, x: splitX - pill.width - 1}];
        } else if (minDistance === rightDistance) {
          return [{...pill, x: splitX + 1}];
        } else if (minDistance === topDistance) {
          return [{...pill, y: splitY - pill.height - 1}];
        } else {
          return [{...pill, y: splitY + 1}];
        }
      }
    } else if (verticalIntersects) {
      // Split vertically (2 parts)
      const leftWidth = splitX - pill.x;
      const rightWidth = pill.width - leftWidth;

      if (leftWidth >= minSize && rightWidth >= minSize) {
        parts.push({
          id: `${pill.id}-l-${Date.now()}`,
          x: pill.x,
          y: pill.y,
          width: leftWidth,
          height: pill.height,
          color: pill.color,
          zIndex: pill.zIndex,
          borderRadius: {
            topLeft: pill.borderRadius.topLeft, // Keep original
            topRight: 0, // Split edge
            bottomLeft: pill.borderRadius.bottomLeft, // Keep original
            bottomRight: 0 // Split edge
          }
        });

        parts.push({
          id: `${pill.id}-r-${Date.now()}`,
          x: splitX,
          y: pill.y,
          width: rightWidth,
          height: pill.height,
          color: pill.color,
          zIndex: pill.zIndex,
          borderRadius: {
            topLeft: 0, // Split edge
            topRight: pill.borderRadius.topRight, // Keep original
            bottomLeft: 0, // Split edge
            bottomRight: pill.borderRadius.bottomRight // Keep original
          }
        });
      } else {
        // Too small to split, move to one side
        if (leftWidth < rightWidth) {
          parts.push({
            ...pill,
            x: splitX + 1
          });
        } else {
          parts.push({
            ...pill,
            x: splitX - pill.width - 1
          });
        }
      }
    } else if (horizontalIntersects) {
      // Split horizontally (2 parts)
      const topHeight = splitY - pill.y;
      const bottomHeight = pill.height - topHeight;

      if (topHeight >= minSize && bottomHeight >= minSize) {
        parts.push({
          id: `${pill.id}-t-${Date.now()}`,
          x: pill.x,
          y: pill.y,
          width: pill.width,
          height: topHeight,
          color: pill.color,
          zIndex: pill.zIndex,
          borderRadius: {
            topLeft: pill.borderRadius.topLeft, // Keep original
            topRight: pill.borderRadius.topRight, // Keep original
            bottomLeft: 0, // Split edge
            bottomRight: 0 // Split edge
          }
        });

        parts.push({
          id: `${pill.id}-b-${Date.now()}`,
          x: pill.x,
          y: splitY,
          width: pill.width,
          height: bottomHeight,
          color: pill.color,
          zIndex: pill.zIndex,
          borderRadius: {
            topLeft: 0, // Split edge
            topRight: 0, // Split edge
            bottomLeft: pill.borderRadius.bottomLeft, // Keep original
            bottomRight: pill.borderRadius.bottomRight // Keep original
          }
        });
      } else {
        // Too small to split, move to one side
        if (topHeight < bottomHeight) {
          parts.push({
            ...pill,
            y: splitY + 1
          });
        } else {
          parts.push({
            ...pill,
            y: splitY - pill.height - 1
          });
        }
      }
    }

    return parts.length > 0 ? parts : [pill];
  }, []);

  // Handle mouse up
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Only create pill if we were drawing AND actually dragged
    if (isDrawing && newPill && newPill.width && newPill.height && hasDraggedSinceMouseDown) {
      setPills(prevPills => [...prevPills, newPill as Pill]);
      setNewPill(null);
    }

    // If we clicked but didn't drag (either on empty space or on a pill), split
    if (!hasDraggedSinceMouseDown) {
      // Split pills along the split lines
      const newPills: Pill[] = [];
      
      pills.forEach(pill => {
        const pillsToAdd = splitPill(pill, clickX, clickY);
        newPills.push(...pillsToAdd);
      });
      
      setPills(newPills);
    }
    
    setIsDrawing(false);
    setDraggedPillId(null);
    setHasDraggedSinceMouseDown(false);
    setNewPill(null); // Clear any pending new pill
  }, [isDrawing, newPill, hasDraggedSinceMouseDown, pills, splitPill]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-screen bg-gray-100 relative overflow-hidden cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* Split lines following cursor */}
      <div 
        className="absolute bg-red-500 opacity-50 pointer-events-none"
        style={{
          left: mousePosition.x - 1,
          top: 0,
          width: 2,
          height: '100%'
        }}
      />
      <div 
        className="absolute bg-red-500 opacity-50 pointer-events-none"
        style={{
          left: 0,
          top: mousePosition.y - 1,
          width: '100%',
          height: 2
        }}
      />

      {/* Render existing pills */}
      {pills
        .sort((a, b) => a.zIndex - b.zIndex) // Sort by zIndex to maintain proper layering
        .map(pill => (
        <div
          key={pill.id}
          className="absolute border-2 border-gray-800 cursor-pointer"
          style={{
            left: pill.x,
            top: pill.y,
            width: pill.width,
            height: pill.height,
            backgroundColor: pill.color,
            zIndex: pill.zIndex,
            borderRadius: `${pill.borderRadius.topLeft}px ${pill.borderRadius.topRight}px ${pill.borderRadius.bottomRight}px ${pill.borderRadius.bottomLeft}px`
          }}
        />
      ))}

      {/* Render pill being drawn */}
      {isDrawing && newPill && (
        <div
          className="absolute border-2 border-gray-800 opacity-80"
          style={{
            left: newPill.x,
            top: newPill.y,
            width: newPill.width,
            height: newPill.height,
            backgroundColor: newPill.color,
            zIndex: newPill.zIndex || 1,
            borderRadius: `${newPill.borderRadius?.topLeft || 20}px ${newPill.borderRadius?.topRight || 20}px ${newPill.borderRadius?.bottomRight || 20}px ${newPill.borderRadius?.bottomLeft || 20}px`
          }}
        />
      )}

     
      </div>
  
  );
}

export default App;
