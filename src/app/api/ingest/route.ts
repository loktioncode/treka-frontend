import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Check if device_id is present
        if (!body.device_id) {
            return NextResponse.json(
                { message: 'device_id is required', accepted: false },
                { status: 400 }
            );
        }

        // Forward the request to the Py backend
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const ingestUrl = `${backendUrl}/api/v1/telemetry/ingest`;

        const response = await fetch(ingestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        return NextResponse.json(data, { status: response.status });

    } catch (error) {
        console.error('Error forwarding telemetry data:', error);
        return NextResponse.json(
            { message: 'Internal Server Error', accepted: false },
            { status: 500 }
        );
    }
}
