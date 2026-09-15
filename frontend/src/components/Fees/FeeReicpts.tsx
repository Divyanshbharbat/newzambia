/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { feetable, getInstitutionNameAndLogo } from "../../apis/api";
import { useRecoilValue } from "recoil";
import { installmentArr } from "../../store/store";

const FeeReicpts = ({ id , name } : {id : number ,name : any}) => {

  const [title ,setTitle] = useState<string>('');
  const [, setFeedata] = useState<any>();
  const [sName, setSName] = useState<string>('ST.VINCENT PALLOTTI SCHOOL ZAMBIA');
  const [sAddress, setSAddress] = useState<string>('WESTWOOD, LUSAKA, ZAMBIA');
  const installmentArray = useRecoilValue(installmentArr);
  const fetchFeeData = async () => {
    try {
      // First, fetch complete student data with all fees (without title filter)
      const { data: allFeesData } = await feetable(id, '');
      const completeData = allFeesData[0];
      
      // Then fetch the current installment specific data to get the current installment amount
      const { data: currentInstallmentData } = await feetable(id, title);
      
      // Merge the data - use all fees from allFeesData but current amount from currentInstallmentData
      if (currentInstallmentData && currentInstallmentData[0]) {
        completeData.currentInstallmentAmount = currentInstallmentData[0].fees?.[0]?.amount || 0;
      }
      
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
    const currentInstallmentAmount = data.currentInstallmentAmount !== undefined 
      ? data.currentInstallmentAmount 
      : (data.fees && data.fees.length > 0 ? data.fees[0].amount : 0);
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

    const documentChildren: any[] = [];

    // ===================== SCHOOL HEADER =====================
    const schoolDisplayName = (sName && sName !== 'School') ? sName : "ST.VINCENT PALLOTTI SCHOOL ZAMBIA";
    const addressToUse = sAddress || "WESTWOOD, LUSAKA, ZAMBIA";
    documentChildren.push(
      new Paragraph({
        children: [new TextRun({ text: schoolDisplayName, bold: true, size: 44, color: "1E3A8A" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 50 },
      }),
      new Paragraph({
        children: [new TextRun({ text: addressToUse, size: 20 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // ===================== RECEIPT TITLE =====================
    documentChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "FEE RECEIPT & INVOICE", bold: true, size: 32, color: "1E3A8A" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );

    // ===================== RECEIPT INFO TABLE =====================
    documentChildren.push(
      new Table({
        width: { size: 100, type: "pct" },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: "pct" },
                borders: { bottom: { style: BorderStyle.SINGLE } },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "Receipt Date: ", bold: true }), new TextRun({ text: formattedDate })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: "pct" },
                borders: { bottom: { style: BorderStyle.SINGLE } },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "Receipt No: ", bold: true }), new TextRun({ text: `REC-${data.id}-${year}` })],
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    documentChildren.push(new Paragraph({ text: "", spacing: { after: 200 } }));

    // ===================== STUDENT DETAILS =====================
    documentChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "STUDENT DETAILS", bold: true, size: 24, color: "1E3A8A" })],
        spacing: { after: 150 },
      }),
      new Table({
        width: { size: 100, type: "pct" },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 25, type: "pct" },
                shading: { fill: "E8F4F8" },
                children: [new Paragraph({ children: [new TextRun({ text: "Name", bold: true })] })],
              }),
              new TableCell({
                width: { size: 25, type: "pct" },
                children: [new Paragraph({ text: name || "N/A" })],
              }),
              new TableCell({
                width: { size: 25, type: "pct" },
                shading: { fill: "E8F4F8" },
                children: [new Paragraph({ children: [new TextRun({ text: "Class", bold: true })] })],
              }),
              new TableCell({
                width: { size: 25, type: "pct" },
                children: [new Paragraph({ text: data.standard || "N/A" })],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 25, type: "pct" },
                shading: { fill: "E8F4F8" },
                children: [new Paragraph({ children: [new TextRun({ text: "Roll Number", bold: true })] })],
              }),
              new TableCell({
                width: { size: 25, type: "pct" },
                children: [new Paragraph({ text: data.rollNo ? data.rollNo.toString() : "N/A" })],
              }),
              new TableCell({
                width: { size: 25, type: "pct" },
                shading: { fill: "E8F4F8" },
                children: [new Paragraph({ children: [new TextRun({ text: "Admission No", bold: true })] })],
              }),
              new TableCell({
                width: { size: 25, type: "pct" },
                children: [new Paragraph({ text: data.id ? data.id.toString() : "N/A" })],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 25, type: "pct" },
                shading: { fill: "E8F4F8" },
                columnSpan: 2,
                children: [new Paragraph({ children: [new TextRun({ text: "Academic Year", bold: true })] })],
              }),
              new TableCell({
                width: { size: 50, type: "pct" },
                columnSpan: 2,
                children: [new Paragraph({ text: data.session || `${year}-${year + 1}` })],
              }),
            ],
          }),
        ],
      })
    );

    documentChildren.push(new Paragraph({ text: "", spacing: { after: 250 } }));

    // ===================== FEE STRUCTURE (INSTALLMENT-WISE) =====================
    documentChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "FEE STRUCTURE - INSTALLMENT WISE", bold: true, size: 24, color: "1E3A8A" })],
        spacing: { after: 150 },
      })
    );

    // Fee structure table header
    const feeStructureRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "1E3A8A" },
            children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true, color: "FFFFFF" })] })],
            borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE } },
          }),
          new TableCell({
            shading: { fill: "1E3A8A" },
            children: [new Paragraph({ children: [new TextRun({ text: "Amount (K)", bold: true, color: "FFFFFF" })], alignment: AlignmentType.RIGHT })],
            borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE } },
          }),
        ],
      }),
    ];

    // Add school fee
    feeStructureRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "School Fee", bold: true })] })],
            shading: { fill: "F0F0F0" },
          }),
          new TableCell({
            children: [new Paragraph({ text: "", alignment: AlignmentType.RIGHT })],
            shading: { fill: "F0F0F0" },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: "  \u2022 " + (title || "Tuition Fee") })],
          }),
          new TableCell({
            children: [new Paragraph({ text: `K ${currentInstallmentAmount}`, alignment: AlignmentType.RIGHT })],
          }),
        ],
      })
    );

    documentChildren.push(
      new Table({
        width: { size: 100, type: "pct" },
        rows: feeStructureRows,
      })
    );

    documentChildren.push(new Paragraph({ text: "", spacing: { after: 150 } }));

    // ===================== INVENTORY SECTION =====================
    if (inventoryItems.length > 0) {
      documentChildren.push(
        new Paragraph({
          children: [new TextRun({ text: "INVENTORY / MATERIALS CHARGES", bold: true, size: 24, color: "1E3A8A" })],
          spacing: { after: 150 },
        })
      );

      const inventoryTableRows: TableRow[] = [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: "pct" },
              shading: { fill: "1E3A8A" },
              children: [new Paragraph({ children: [new TextRun({ text: "Item Name", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              width: { size: 20, type: "pct" },
              shading: { fill: "1E3A8A" },
              children: [new Paragraph({ children: [new TextRun({ text: "Qty", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
            }),
            new TableCell({
              width: { size: 20, type: "pct" },
              shading: { fill: "1E3A8A" },
              children: [new Paragraph({ children: [new TextRun({ text: "Price/Item (K)", bold: true, color: "FFFFFF" })], alignment: AlignmentType.RIGHT })],
            }),
            new TableCell({
              width: { size: 20, type: "pct" },
              shading: { fill: "1E3A8A" },
              children: [new Paragraph({ children: [new TextRun({ text: "Total (K)", bold: true, color: "FFFFFF" })], alignment: AlignmentType.RIGHT })],
            }),
          ],
        }),
      ];

      inventoryItems.forEach((item: any) => {
        const pricePerItem = item.quantityPurchased > 0 ? item.totalPrice / item.quantityPurchased : 0;
        inventoryTableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: item.inventory?.itemName || "Item" })],
              }),
              new TableCell({
                children: [new Paragraph({ text: item.quantityPurchased.toString(), alignment: AlignmentType.CENTER })],
              }),
              new TableCell({
                children: [new Paragraph({ text: `K ${pricePerItem.toFixed(2)}`, alignment: AlignmentType.RIGHT })],
              }),
              new TableCell({
                children: [new Paragraph({ text: `K ${item.totalPrice.toFixed(2)}`, alignment: AlignmentType.RIGHT })],
              }),
            ],
          })
        );
      });

      // Inventory total
      inventoryTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 3,
              children: [new Paragraph({ children: [new TextRun({ text: "Inventory Total", bold: true })], alignment: AlignmentType.RIGHT })],
              shading: { fill: "F0F0F0" },
              borders: { top: { style: BorderStyle.SINGLE } },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `K ${inventoryTotal.toFixed(2)}`, bold: true })], alignment: AlignmentType.RIGHT })],
              shading: { fill: "F0F0F0" },
              borders: { top: { style: BorderStyle.SINGLE } },
            }),
          ],
        })
      );

      documentChildren.push(
        new Table({
          width: { size: 100, type: "pct" },
          rows: inventoryTableRows,
        })
      );

      documentChildren.push(new Paragraph({ text: "", spacing: { after: 150 } }));
    }

    // ===================== OPTIONAL SECTIONS =====================
    // Lunch Section
    if (data.lunchAccepted && lunchPrice > 0) {
      documentChildren.push(
        new Paragraph({
          children: [new TextRun({ text: "LUNCH / MEALS CHARGES", bold: true, size: 24, color: "1E3A8A" })],
          spacing: { after: 150 },
        }),
        new Table({
          width: { size: 100, type: "pct" },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: "1E3A8A" },
                  width: { size: 70, type: "pct" },
                  children: [new Paragraph({ children: [new TextRun({ text: "School Lunch / Meals Plan", bold: true, color: "FFFFFF" })] })],
                }),
                new TableCell({
                  shading: { fill: "1E3A8A" },
                  width: { size: 30, type: "pct" },
                  children: [new Paragraph({ children: [new TextRun({ text: "Amount (K)", bold: true, color: "FFFFFF" })], alignment: AlignmentType.RIGHT })],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "  \u2022 School Lunch / Meals Fee" })],
                }),
                new TableCell({
                  children: [new Paragraph({ text: `K ${lunchPrice.toFixed(2)}`, alignment: AlignmentType.RIGHT })],
                }),
              ],
            }),
          ],
        })
      );

      documentChildren.push(new Paragraph({ text: "", spacing: { after: 150 } }));
    }

    // Bus Section
    if (data.busAccepted && busPrice > 0) {
      documentChildren.push(
        new Paragraph({
          children: [new TextRun({ text: "BUS / TRANSPORT CHARGES", bold: true, size: 24, color: "1E3A8A" })],
          spacing: { after: 150 },
        }),
        new Table({
          width: { size: 100, type: "pct" },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: "1E3A8A" },
                  width: { size: 70, type: "pct" },
                  children: [new Paragraph({ children: [new TextRun({ text: "Bus Service Fee", bold: true, color: "FFFFFF" })] })],
                }),
                new TableCell({
                  shading: { fill: "1E3A8A" },
                  width: { size: 30, type: "pct" },
                  children: [new Paragraph({ children: [new TextRun({ text: "Amount (K)", bold: true, color: "FFFFFF" })], alignment: AlignmentType.RIGHT })],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "  \u2022 Bus Service Fee" })],
                }),
                new TableCell({
                  children: [new Paragraph({ text: `K ${busPrice.toFixed(2)}`, alignment: AlignmentType.RIGHT })],
                }),
              ],
            }),
          ],
        })
      );

      documentChildren.push(new Paragraph({ text: "", spacing: { after: 150 } }));
    }

    // ===================== PAYMENT SUMMARY =====================
    documentChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "PAYMENT SUMMARY", bold: true, size: 24, color: "1E3A8A" })],
        spacing: { after: 150 },
      })
    );

    // Build payment summary
    const paymentSummaryRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: "pct" },
            shading: { fill: "E8F4F8" },
            children: [new Paragraph({ children: [new TextRun({ text: "Total School Fees", bold: true })] })],
          }),
          new TableCell({
            width: { size: 40, type: "pct" },
            shading: { fill: "E8F4F8" },
            children: [new Paragraph({ children: [new TextRun({ text: `K ${standardTotalFees.toFixed(2)}`, bold: true })], alignment: AlignmentType.RIGHT })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: "Inventory Amount" })],
          }),
          new TableCell({
            children: [new Paragraph({ text: `K ${inventoryTotal.toFixed(2)}`, alignment: AlignmentType.RIGHT })],
          }),
        ],
      }),
    ];

    if (data.lunchAccepted && lunchPrice > 0) {
      paymentSummaryRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "Lunch / Meals Charges" })],
            }),
            new TableCell({
              children: [new Paragraph({ text: `K ${lunchPrice.toFixed(2)}`, alignment: AlignmentType.RIGHT })],
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
              children: [new Paragraph({ text: "Bus / Transport Charges" })],
            }),
            new TableCell({
              children: [new Paragraph({ text: `K ${busPrice.toFixed(2)}`, alignment: AlignmentType.RIGHT })],
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
            children: [new Paragraph({ children: [new TextRun({ text: "Grand Total (Current)", bold: true })] })],
          }),
          new TableCell({
            shading: { fill: "FFF3E0" },
            children: [new Paragraph({ children: [new TextRun({ text: `K ${grandTotal.toFixed(2)}`, bold: true })], alignment: AlignmentType.RIGHT })],
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
              children: [new Paragraph({ children: [new TextRun({ text: "PAYMENT HISTORY", bold: true, size: 20 })] })],
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
                children: [new Paragraph({ text: `  Paid ${num}${suffix} Installment` })],
              }),
              new TableCell({
                children: [new Paragraph({ text: `K ${fee.amount.toFixed(2)}`, alignment: AlignmentType.RIGHT })],
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
            children: [new Paragraph({ children: [new TextRun({ text: "Total Amount Paid", bold: true })] })],
          }),
          new TableCell({
            shading: { fill: "E8F5E9" },
            children: [new Paragraph({ children: [new TextRun({ text: `K ${totalFeesPaid.toFixed(2)}`, bold: true })], alignment: AlignmentType.RIGHT })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "FFEBEE" },
            children: [new Paragraph({ children: [new TextRun({ text: "Remaining Balance", bold: true, color: "C62828" })] })],
          }),
          new TableCell({
            shading: { fill: "FFEBEE" },
            children: [new Paragraph({ children: [new TextRun({ text: `K ${remainingBalance.toFixed(2)}`, bold: true, color: "C62828" })], alignment: AlignmentType.RIGHT })],
          }),
        ],
      })
    );

    documentChildren.push(
      new Table({
        width: { size: 100, type: "pct" },
        rows: paymentSummaryRows,
      })
    );

    documentChildren.push(new Paragraph({ text: "", spacing: { after: 250 } }));

    // ===================== FOOTER =====================
    documentChildren.push(
      new Paragraph({
        text: "═".repeat(85),
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Authorized Signature", italics: true })],
        spacing: { after: 50 },
      }),
      new Paragraph({
        text: "",
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "_____________________", italics: true })],
        spacing: { after: 50 },
      }),
      new Paragraph({
        text: "[School Stamp Area]",
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "This is a system-generated receipt. No signature required.", italics: true, size: 18, color: "666666" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 50 },
      })
    );

    const doc = new Document({
      sections: [
        {
          children: documentChildren,
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `${name}_fee_receipt_${year}.docx`);
    });
  };
 

  const handlechange = (e: React.ChangeEvent<HTMLSelectElement>)=>{
      setTitle(e.target.value);
  }

  return (
    <div>
      <h2>Get Receipt</h2>
      <div>
            <label>Installment Type</label>
            <select
              name="title"
              value={title}
              onChange={handlechange}
            >
              <option value="">Select installment type</option>
              <option value="">Select installment type</option>
                {installmentArray.map((ele,id)=>(
                  <option key={id} value={ele}>{ele}</option>
              ))}
            </select>
      </div>
      <button onClick={fetchFeeData}>Generate Receipt</button>
    </div>
  );
};


export default FeeReicpts

