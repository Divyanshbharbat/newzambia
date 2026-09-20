/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { feetable, getInstitutionNameAndLogo } from "../../apis/api";

const FeeReicpts = ({ id , name } : {id : number ,name : any}) => {

  const [, setFeedata] = useState<any>();
  const [sName, setSName] = useState<string>('ST.VINCENT PALLOTTI SCHOOL ZAMBIA');
  const [sAddress, setSAddress] = useState<string>('WESTWOOD, LUSAKA, ZAMBIA');
  const fetchFeeData = async () => {
    try {
      const { data: allFeesData } = await feetable(id, '');
      const completeData = allFeesData[0];
      setFeedata(completeData);
      generateWordDocument(completeData);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const fetchInstituteName = async () => {
      try {
        const data = await getInstitutionNameAndLogo();
        if (data?.Institution_name && data.Institution_name !== 'School') {
          setSName(data.Institution_name);
        } else {
          setSName('ST.VINCENT PALLOTTI SCHOOL ZAMBIA');
        }
        if (data?.SchoolAddress) {
          setSAddress(data.SchoolAddress);
        }
      } catch (err) {
        console.error("Error fetching institute name:", err);
      }
    };
    fetchInstituteName();
  }, []);

  const generateWordDocument = async(data : any) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${dayOfMonth}/${month}/${year}`;

    // Calculate all amounts
    const standardTotalFees = Number(data.standardTotalFees || 0);

    // Calculate inventory total
    let inventoryTotal = 0;
    let inventoryItems: any[] = [];
    if (data.studentInventory && data.studentInventory.length > 0) {
      inventoryItems = data.studentInventory;
      inventoryTotal = inventoryItems.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
    }

    const lunchPrice = data.lunchAccepted ? (data.lunchPrice || data.lunchFee || 0) : 0;
    const busPrice = data.busAccepted ? (data.busPrice || data.busFee || 0) : 0;

    // Grand Total = Total School Fees + Inventory Amount + Lunch / Meals Charges + Bus / Transport Charges
    const grandTotal = standardTotalFees + inventoryTotal + lunchPrice + busPrice;

    // Total Amount Paid = Sum of all fee installments paid
    const totalFeesPaid = data.fees && data.fees.length > 0 
      ? data.fees.reduce((sum: number, f: any) => sum + (parseFloat(f.amount) || 0), 0) 
      : 0;

    // Remaining Balance = Grand Total - Total Amount Paid
    const remainingBalance = Math.max(0, grandTotal - totalFeesPaid);

    // Cell padding helper to ensure comfortable spacing away from vertical borders
    const cellPadding = { top: 60, bottom: 60, left: 140, right: 140 };

    // Helper to generate Payment Summary Table (creates fresh Table instances)
    const buildPaymentSummaryTable = () => {
      const paymentSummaryRows: TableRow[] = [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 60, type: "pct" },
              shading: { fill: "E8F4F8" },
              margins: cellPadding,
              children: [new Paragraph({ children: [new TextRun({ text: "Total School Fees", bold: true, size: 18 })], spacing: { before: 10, after: 10 } })],
            }),
            new TableCell({
              width: { size: 40, type: "pct" },
              shading: { fill: "E8F4F8" },
              margins: cellPadding,
              children: [new Paragraph({ children: [new TextRun({ text: `K ${standardTotalFees.toFixed(2)}`, bold: true, size: 18 })], alignment: AlignmentType.RIGHT, spacing: { before: 10, after: 10 } })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              margins: cellPadding,
              children: [new Paragraph({ children: [new TextRun({ text: "Inventory Amount", size: 18 })], spacing: { before: 10, after: 10 } })],
            }),
            new TableCell({
              margins: cellPadding,
              children: [new Paragraph({ children: [new TextRun({ text: `K ${inventoryTotal.toFixed(2)}`, size: 18 })], alignment: AlignmentType.RIGHT, spacing: { before: 10, after: 10 } })],
            }),
          ],
        }),
      ];

      if (data.lunchAccepted && lunchPrice > 0) {
        paymentSummaryRows.push(
          new TableRow({
            children: [
              new TableCell({
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: "Lunch / Meals Charges", size: 18 })], spacing: { before: 10, after: 10 } })],
              }),
              new TableCell({
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: `K ${lunchPrice.toFixed(2)}`, size: 18 })], alignment: AlignmentType.RIGHT, spacing: { before: 10, after: 10 } })],
              }),
            ],
          })
        );
      }

      if (data.busAccepted && busPrice > 0) {
        paymentSummaryRows.push(
          new TableRow({
            children: [
              new TableCell({
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: "Bus / Transport Charges", size: 18 })], spacing: { before: 10, after: 10 } })],
              }),
              new TableCell({
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: `K ${busPrice.toFixed(2)}`, size: 18 })], alignment: AlignmentType.RIGHT, spacing: { before: 10, after: 10 } })],
              }),
            ],
          })
        );
      }

      paymentSummaryRows.push(
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: "FFF3E0" },
              margins: cellPadding,
              children: [new Paragraph({ children: [new TextRun({ text: "Grand Total (Current)", bold: true, size: 18 })], spacing: { before: 10, after: 10 } })],
            }),
            new TableCell({
              shading: { fill: "FFF3E0" },
              margins: cellPadding,
              children: [new Paragraph({ children: [new TextRun({ text: `K ${grandTotal.toFixed(2)}`, bold: true, size: 18 })], alignment: AlignmentType.RIGHT, spacing: { before: 10, after: 10 } })],
            }),
          ],
        })
      );

      // Payment history
      if (data.fees && data.fees.length > 0) {
        paymentSummaryRows.push(
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 2,
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: "PAYMENT HISTORY", bold: true, size: 18 })], spacing: { before: 10, after: 10 } })],
                shading: { fill: "D4E6F1" },
              }),
            ],
          })
        );

        data.fees.forEach((fee: any, index: number) => {
          const num = index + 1;
          const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
          paymentSummaryRows.push(
            new TableRow({
              children: [
                new TableCell({
                  margins: cellPadding,
                  children: [new Paragraph({ children: [new TextRun({ text: `  Paid ${num}${suffix} Installment`, size: 18 })], spacing: { before: 10, after: 10 } })],
                }),
                new TableCell({
                  margins: cellPadding,
                  children: [new Paragraph({ children: [new TextRun({ text: `K ${parseFloat(fee.amount).toFixed(2)}`, size: 18 })], alignment: AlignmentType.RIGHT, spacing: { before: 10, after: 10 } })],
                }),
              ],
            })
          );
        });
      }

      paymentSummaryRows.push(
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: "E8F5E9" },
              margins: cellPadding,
              children: [new Paragraph({ children: [new TextRun({ text: "Total Amount Paid", bold: true, size: 18 })], spacing: { before: 10, after: 10 } })],
            }),
            new TableCell({
              shading: { fill: "E8F5E9" },
              margins: cellPadding,
              children: [new Paragraph({ children: [new TextRun({ text: `K ${totalFeesPaid.toFixed(2)}`, bold: true, size: 18 })], alignment: AlignmentType.RIGHT, spacing: { before: 10, after: 10 } })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: "FFEBEE" },
              margins: cellPadding,
              children: [new Paragraph({ children: [new TextRun({ text: "Remaining Balance", bold: true, color: "C62828", size: 18 })], spacing: { before: 10, after: 10 } })],
            }),
            new TableCell({
              shading: { fill: "FFEBEE" },
              margins: cellPadding,
              children: [new Paragraph({ children: [new TextRun({ text: `K ${remainingBalance.toFixed(2)}`, bold: true, color: "C62828", size: 18 })], alignment: AlignmentType.RIGHT, spacing: { before: 10, after: 10 } })],
            }),
          ],
        })
      );

      return new Table({
        width: { size: 100, type: "pct" },
        margins: cellPadding,
        rows: paymentSummaryRows,
      });
    };

    const documentChildren: any[] = [];

    // ===================== 1. SCHOOL HEADER (INSTITUTE COPY) =====================
    const schoolDisplayName = (sName && sName !== 'School') ? sName : "ST.VINCENT PALLOTTI SCHOOL ZAMBIA";
    const addressToUse = sAddress || "WESTWOOD, LUSAKA, ZAMBIA";
    documentChildren.push(
      new Paragraph({
        children: [new TextRun({ text: schoolDisplayName, bold: true, size: 30, color: "1E3A8A" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 15 },
      }),
      new Paragraph({
        children: [new TextRun({ text: addressToUse, size: 17, color: "444444" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 25 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "FEE RECEIPT & INVOICE (INSTITUTE COPY)", bold: true, size: 22, color: "1E3A8A" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 200 },
      })
    );

    // ===================== RECEIPT INFO TABLE =====================
    documentChildren.push(
      new Table({
        width: { size: 100, type: "pct" },
        margins: cellPadding,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: "pct" },
                borders: { bottom: { style: BorderStyle.SINGLE } },
                margins: cellPadding,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "Receipt Date: ", bold: true, size: 18 }), new TextRun({ text: formattedDate, size: 18 })],
                    spacing: { before: 10, after: 10 },
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: "pct" },
                borders: { bottom: { style: BorderStyle.SINGLE } },
                margins: cellPadding,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "Receipt No: ", bold: true, size: 18 }), new TextRun({ text: `REC-${data.id}-${year}`, size: 18 })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 10, after: 10 },
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    // ===================== STUDENT DETAILS (INSTITUTE COPY) =====================
    documentChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "STUDENT DETAILS", bold: true, size: 20, color: "1E3A8A" })],
        spacing: { before: 200, after: 160 },
      }),
      new Table({
        width: { size: 100, type: "pct" },
        margins: cellPadding,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 20, type: "pct" },
                shading: { fill: "E8F4F8" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: "Name", bold: true, size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
              new TableCell({
                width: { size: 30, type: "pct" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: name || "N/A", size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
              new TableCell({
                width: { size: 20, type: "pct" },
                shading: { fill: "E8F4F8" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: "Class", bold: true, size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
              new TableCell({
                width: { size: 30, type: "pct" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: data.standard || "N/A", size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 20, type: "pct" },
                shading: { fill: "E8F4F8" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: "Roll Number", bold: true, size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
              new TableCell({
                width: { size: 30, type: "pct" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: data.rollNo ? data.rollNo.toString() : "N/A", size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
              new TableCell({
                width: { size: 20, type: "pct" },
                shading: { fill: "E8F4F8" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: "Admission No", bold: true, size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
              new TableCell({
                width: { size: 30, type: "pct" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: data.id ? data.id.toString() : "N/A", size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 20, type: "pct" },
                shading: { fill: "E8F4F8" },
                margins: cellPadding,
                columnSpan: 2,
                children: [new Paragraph({ children: [new TextRun({ text: "Academic Year", bold: true, size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
              new TableCell({
                width: { size: 50, type: "pct" },
                margins: cellPadding,
                columnSpan: 2,
                children: [new Paragraph({ children: [new TextRun({ text: (data.session ? String(data.session) : String(year)), size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
            ],
          }),
        ],
      })
    );

    // ===================== PAYMENT SUMMARY (INSTITUTE COPY) =====================
    documentChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "PAYMENT SUMMARY", bold: true, size: 20, color: "1E3A8A" })],
        spacing: { before: 200, after: 160 },
      }),
      buildPaymentSummaryTable(),
      new Paragraph({
        children: [new TextRun({ text: "Authorized Signature: ______________________", italics: true, size: 17 })],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120, after: 120 },
      })
    );

    // ===================== DASHED CUT LINE (FULL TABLE LENGTH) =====================
    documentChildren.push(
      new Table({
        width: { size: 100, type: "pct" },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.DASHED, size: 8, color: "777777" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 100, type: "pct" },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.DASHED, size: 8, color: "777777" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: [
                  new Paragraph({
                    children: [],
                    spacing: { before: 80, after: 80 },
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    // ===================== STUDENT / PARENT COPY =====================
    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: schoolDisplayName, bold: true, size: 26, color: "1E3A8A" }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 140, after: 20 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "FEE RECEIPT (STUDENT / PARENT COPY)", bold: true, size: 19, color: "1E3A8A" }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 160 },
      }),
      new Table({
        width: { size: 100, type: "pct" },
        margins: cellPadding,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 16, type: "pct" },
                shading: { fill: "E8F4F8" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: "Student Name", bold: true, size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
              new TableCell({
                width: { size: 34, type: "pct" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: name || "N/A", bold: true, size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
              new TableCell({
                width: { size: 12, type: "pct" },
                shading: { fill: "E8F4F8" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: "Class", bold: true, size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
              new TableCell({
                width: { size: 16, type: "pct" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: data.standard || "N/A", size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
              new TableCell({
                width: { size: 10, type: "pct" },
                shading: { fill: "E8F4F8" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true, size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
              new TableCell({
                width: { size: 12, type: "pct" },
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: formattedDate, size: 18 })], spacing: { before: 12, after: 12 } })],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: "PAYMENT SUMMARY", bold: true, size: 20, color: "1E3A8A" })],
        spacing: { before: 200, after: 160 },
      }),
      buildPaymentSummaryTable(),
      new Table({
        width: { size: 100, type: "pct" },
        margins: { top: 240, bottom: 120, left: 60, right: 60 },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: "pct" },
                margins: { top: 240, bottom: 120, left: 60, right: 60 },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "Authorized Signature: ____________________", italics: true, size: 18 })],
                    spacing: { before: 160, after: 80 },
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: "pct" },
                margins: { top: 240, bottom: 120, left: 60, right: 60 },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "[ School Stamp Area ]", italics: true, size: 18, color: "555555" })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 160, after: 80 },
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 400,
                right: 500,
                bottom: 400,
                left: 500,
              },
            },
          },
          children: documentChildren,
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `${name}_fee_receipt_${year}.docx`);
    });
  };
 

  return (
    <div>
      <h2>Get Receipt</h2>
      <button onClick={fetchFeeData} style={{ marginTop: '8px' }}>Generate Receipt</button>
    </div>
  );
};


export default FeeReicpts

