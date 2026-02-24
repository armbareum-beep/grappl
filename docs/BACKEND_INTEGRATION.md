# Video Processing Backend Integration

## Lesson vs Drill Identification

The frontend sends video processing requests with both `drillId` and `lessonId` parameters. Use these to distinguish between lessons and drills:

### Drill Processing
- `drillId`: UUID (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
- `lessonId`: `undefined` or `null`
- Backend should update the `drills` table with the processed video URL

### Lesson Processing  
- `drillId`: `undefined` or `null`
- `lessonId`: UUID (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
- Backend should update the `lessons` table with the processed video URL

### Backend Implementation Required

```typescript
// In your backend /process endpoint:
function processVideoRequest(req, res) {
  const { drillId, lessonId, videoId, filename, cuts, title, description, videoType } = req.body;
  
  // Validate: exactly one of drillId or lessonId should be present
  if (!drillId && !lessonId) {
    return res.status(400).json({ error: 'Either drillId or lessonId is required' });
  }
  
  if (drillId && lessonId) {
    return res.status(400).json({ error: 'Cannot specify both drillId and lessonId' });
  }
  
  // Determine which table to update
  const isLesson = !!lessonId;
  const contentId = isLesson ? lessonId : drillId;
  const tableName = isLesson ? 'lessons' : 'drills';
  
  // Process video...
  // Then update the correct table:
  if (isLesson) {
    // Update lessons table
    await supabase
      .from('lessons')
      .update({ vimeo_url: processedVideoUrl })
      .eq('id', lessonId);
  } else {
    // Update drills table
    await supabase
      .from('drills')
      .update({ 
        vimeo_url: processedVideoUrl,
        description_video_url: videoType === 'desc' ? processedVideoUrl : undefined 
      })
      .eq('id', drillId);
  }
}
```

### Request Body Schema

```typescript
interface ProcessVideoRequest {
  videoId: string;           // UUID for the uploaded file
  filename: string;          // Storage path
  cuts: Array<{ start: number; end: number }>;
  title: string;
  description: string;
  drillId?: string;          // UUID - for drill uploads
  lessonId?: string;         // UUID - for lesson uploads
  videoType?: 'action' | 'desc';  // Type of video
}
```

### Why This Approach?

1. **Clear Separation**: Explicit `lessonId` vs `drillId` makes intent obvious
2. **Type Safety**: Backend can validate that exactly one is provided
3. **Backward Compatibility**: Existing drill uploads continue to work
4. **Future-Proof**: Easy to add more content types later

### Testing

To test lesson uploads:
1. Create a lesson through the UI
2. Check the backend logs for `lessonId` parameter
3. Verify the `lessons` table is updated with `vimeo_url`
4. Confirm the `drills` table is NOT modified

