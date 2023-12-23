export const Modal = (props: IModal) => {
  return (
    <div
      className={`fixed z-10 overflow-y-auto top-0 w-full left-0 ${
        props.isOpen ? "block" : "hidden"
      }`}
      id="modal"
    >
      <div className="flex items-center justify-center min-height-100vh pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity"
          onClick={() => props.toggleModal(false)}
        >
          <div className="absolute inset-0 bg-gray-900 opacity-75" />
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
          &#8203;
        </span>
        <div
          className="inline-block align-center bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div className="">Select Wallet</div>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex justify-center">
            <img
              src="/assets/img/xverse.jpg"
              alt="XVerse"
              className="w-[100px] h-[100px] mr-5 rounded-xl cursor-pointer"
              onClick={() => {
                props.walletConnect(1);
              }}
            />
            <img
              src="/assets/img/unisat.jpg"
              alt="XVerse"
              className="w-[100px] h-[100px] rounded-xl cursor-pointer"
              onClick={() => {
                props.walletConnect(2);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface IModal {
  isOpen: boolean;
  toggleModal: (open: boolean) => void;
  walletConnect: (walletType: number) => void;
}
