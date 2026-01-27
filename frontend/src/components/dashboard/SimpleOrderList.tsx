import React from 'react';
import { format } from 'date-fns';

export interface SimpleOrderListProps {
    poNumber: string;
    date: Date | string;
    vendorName: string;
    senderName: string;
    senderPhone: string;
    items: {
        partNumber: string;
        description: string;
        quantity: number;
    }[];
}

const SimpleOrderList: React.FC<SimpleOrderListProps> = ({
    poNumber,
    date,
    vendorName,
    senderName,
    senderPhone,
    items
}) => {
    const formattedDate = date instanceof Date ? format(date, 'yyyy-MM-dd') : date;

    return (
        <div
            id="simple-order-list"
            className="bg-white p-12 text-black max-w-[210mm] mx-auto min-h-[297mm] relative text-sm font-sans"
            style={{ width: '210mm' }} // A4 width
        >
            {/* Header Section */}
            <div className="flex justify-between items-start mb-8">
                {/* Top Left: App Name */}
                <div>
                    <h1 className="text-gray-400 font-medium tracking-widest uppercase text-sm">
                        DIGIENTRY
                    </h1>
                </div>

                {/* Top Right: Title & Ref */}
                <div className="text-right">
                    <h2 className="text-3xl font-bold text-gray-900 mb-1">ORDER LIST</h2>
                    <p className="text-gray-500 font-medium">#{poNumber}</p>
                    <p className="text-gray-500 text-sm mt-1">{formattedDate}</p>
                </div>
            </div>

            {/* Vendor Line */}
            <div className="mb-10 border-b border-gray-200 pb-4">
                <p className="text-lg text-gray-800">
                    <span className="text-gray-500 mr-2">To:</span>
                    <span className="font-semibold">{vendorName}</span>
                </p>
            </div>

            {/* Data Table */}
            <div className="mb-12">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="py-3 px-2 w-12 text-gray-500 font-semibold uppercase text-xs">#</th>
                            <th className="py-3 px-2 w-48 text-gray-500 font-semibold uppercase text-xs">Part Number</th>
                            <th className="py-3 px-2 text-gray-500 font-semibold uppercase text-xs">Description</th>
                            <th className="py-3 px-2 w-24 text-right text-gray-500 font-semibold uppercase text-xs">Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr
                                key={index}
                                className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                            >
                                <td className="py-4 px-2 text-gray-400 font-mono text-xs">
                                    {index + 1}
                                </td>
                                <td className="py-4 px-2 font-mono text-gray-800 font-medium">
                                    {item.partNumber}
                                </td>
                                <td className="py-4 px-2 text-gray-700 leading-relaxed">
                                    {item.description}
                                </td>
                                <td className="py-4 px-2 text-right">
                                    <span className="font-bold text-lg text-gray-900">
                                        {item.quantity}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer Section */}
            <div className="absolute bottom-12 left-12 right-12 text-center space-y-8">
                {/* Call to Action */}
                <div className="text-gray-800 font-medium border-t border-gray-100 pt-8">
                    Please confirm availability and current prices for these items.
                </div>

                {/* Sender Info - Subtle */}
                <div className="text-xs text-gray-400">
                    Sent by {senderName} - {senderPhone}
                </div>
            </div>
        </div>
    );
};

export default SimpleOrderList;
