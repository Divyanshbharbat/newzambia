import React, { useState } from 'react';

interface AddFeeProps {
  addFee: (fee: Fee) => void;
}

interface Fee {
  title: string;
  amount: number;
  amountDate: string;
  admissionDate: string;
  pendingAmount: number;
}

const AddFee: React.FC<AddFeeProps> = ({ addFee }) => {
  const [fee, setFee] = useState<Fee>({
    title: '',
    amount: 0,
    amountDate: '',
    admissionDate: '',
    pendingAmount: 0,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFee(prevFee => ({ ...prevFee, [name]: value }));
  };

  const handleAddFee = () => {
    addFee(fee); 
    setFee({
      title: '',
      amount: 0,
      amountDate: '',
      admissionDate: '',
      pendingAmount: 0,
    });
  };

  return (
    <div>
      <h3>Add New Fee</h3>
      <div>
        <label>Title</label>
        <input type="text" name="title" value={fee.title} onChange={handleInputChange} />
      </div>
      <div>
        <label>Amount</label>
        <input type="number" name="amount" value={fee.amount} onChange={handleInputChange} />
      </div>
      <div>
        <label>Amount Date</label>
        <input type="date" name="amountDate" value={fee.amountDate} onChange={handleInputChange} />
      </div>
      <div>
        <label>Admission Date</label>
        <input type="date" name="admissionDate" value={fee.admissionDate} onChange={handleInputChange} />
      </div>
      <div>
        <label>Pending Amount</label>
        <input type="number" name="pendingAmount" value={fee.pendingAmount} onChange={handleInputChange} />
      </div>
      <button onClick={handleAddFee}>Add Fee</button>
    </div>
  );
};

export default AddFee;
