import { http, HttpResponse } from 'msw'

const mockInquiryId = 'inq-001'

export const handlers = [
  http.post('/api/inquiry', () => {
    return HttpResponse.json(
      { id: mockInquiryId, message: 'Inquiry submitted successfully' },
      { status: 201 }
    )
  }),

  http.get('/api/pgs', () => {
    return HttpResponse.json({
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
    })
  }),

  http.get('/api/pgs/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Test PG',
      sharing_types: [],
      amenities: [],
      photos: [],
    })
  }),
]
