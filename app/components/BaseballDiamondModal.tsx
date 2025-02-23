import { Dialog, Transition } from "@headlessui/react"
import { Fragment } from "react"

interface Position {
  position: string
  count: number
}

interface BaseballDiamondModalProps {
  isOpen: boolean
  onClose: () => void
  positions: Position[]
}

export default function BaseballDiamondModal({ isOpen, onClose, positions }: BaseballDiamondModalProps) {
  // console.log('Baseball Diamond Modal Positions:', positions)
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <div className="fixed inset-0 bg-black bg-opacity-25" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="w-96 h-[480px] transform rounded-2xl bg-white p-6 pt-16 shadow-xl transition-all">
              <div className="relative w-full h-full">
                {/* Create a square container for the diamond */}
                <div className="relative w-64 aspect-square mx-auto mt-24">
                  {/* Diamond Lines */}
                  <div className="absolute inset-0 border-2 border-gray-300 transform rotate-45" />
                  
                  {/* Home Plate */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center">
                    <div className="mb-2">Home</div>
                    <div className="font-bold">{positions.find(p => p.position === "C")?.count || 0} C</div>
                  </div>
                  
                  {/* First Base - moved further right */}
                  <div className="absolute top-1/2 -right-4 -translate-y-1/2 text-center">
                    <div className="mb-2">1B</div>
                    <div className="font-bold">{positions.find(p => p.position === "1B")?.count || 0}</div>
                  </div>
                  
                  {/* Second Base - moved up to match SS height */}
                  <div className="absolute top-[12%] left-[75%] -translate-x-1/2 text-center">
                    <div className="mb-2">2B</div>
                    <div className="font-bold">{positions.find(p => p.position === "2B")?.count || 0}</div>
                  </div>
                  
                  {/* Shortstop - moved more left */}
                  <div className="absolute top-[12%] left-[20%] text-center">
                    <div className="mb-2">SS</div>
                    <div className="font-bold">{positions.find(p => p.position === "SS")?.count || 0}</div>
                  </div>
                  
                  {/* Third Base - moved further left */}
                  <div className="absolute top-1/2 -left-4 -translate-y-1/2 text-center">
                    <div className="mb-2">3B</div>
                    <div className="font-bold">{positions.find(p => p.position === "3B")?.count || 0}</div>
                  </div>
                  
                  {/* Pitcher */}
                  <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="mb-2">P</div>
                    <div className="font-bold">{positions.find(p => p.position === "P")?.count || 0}</div>
                  </div>
                </div>

                {/* Outfield positions outside the diamond container */}
                <div className="absolute -top-16 left-[10%] text-center">
                  <div className="mb-2">LF</div>
                  <div className="font-bold">{positions.find(p => p.position === "LF")?.count || 0}</div>
                </div>
                
                <div className="absolute -top-36 left-1/2 -translate-x-1/2 text-center">
                  <div className="mb-2">CF</div>
                  <div className="font-bold">{positions.find(p => p.position === "CF")?.count || 0}</div>
                </div>
                
                <div className="absolute -top-16 left-[90%] text-center">
                  <div className="mb-2">RF</div>
                  <div className="font-bold">{positions.find(p => p.position === "RF")?.count || 0}</div>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
} 