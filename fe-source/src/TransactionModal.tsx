export const TransactionModel = (props: ITransactionModel) => {
  return (
    <div
      className={`fixed z-10 overflow-y-auto top-0 w-full left-0 ${
        props.isOpen ? "block" : "hidden"
      }`}
      id="modal"
    >
      <div className="flex items-center justify-center min-height-100vh pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-900 opacity-75" />
        </div>
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          onClick={() => props.toggleModal(false)}
        ></span>
        <div
          className="inline-block align-center bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div className="flex justify-between">
            <p>Claimed</p>
            <p
              onClick={() => props.toggleModal(false)}
              className="cursor-pointer"
            >
              x
            </p>
          </div>
          <a
            href={props.link}
            target="_blank"
            style={{ color: "blue", wordWrap: "break-word" }}
          >
            {props.link}
          </a>
        </div>
      </div>
    </div>
  );
};

interface ITransactionModel {
  isOpen: boolean;
  toggleModal: (open: boolean) => void;
  link: string;
}
